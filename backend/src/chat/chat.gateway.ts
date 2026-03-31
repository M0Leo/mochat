import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { UseGuards } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { PrismaService } from '@/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway(8000, {
  cors: {
    origin: 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/chats',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private socketUserMap = new Map<string, string>();
  private userConnectionCount = new Map<string, number>();

  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @WebSocketServer()
  private server: Server;

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) throw new WsException('No token');

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_PRIVATE_KEY'),
      });

      client.data.user = payload;

      const userId = payload.sub as string;
      this.socketUserMap.set(client.id, userId);

      const isFirstConnection = !this.userConnectionCount.has(userId);
      this.userConnectionCount.set(
        userId,
        (this.userConnectionCount.get(userId) ?? 0) + 1,
      );

      const participations = await this.prisma.participant.findMany({
        where: { userId },
        select: { chatId: true },
      });
      const roomIds = participations.map((p) => p.chatId);
      await client.join(roomIds);

      if (isFirstConnection) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { isOnline: true },
        });

        roomIds.forEach((roomId) => {
          client.to(roomId).emit('user_online', { userId });
        });
      }
    } catch (err) {
      client.emit('error', { code: 'AUTH_FAILED', message: err });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketUserMap.get(client.id);
    if (!userId) return;

    this.socketUserMap.delete(client.id);

    const remaining = (this.userConnectionCount.get(userId) ?? 1) - 1;
    if (remaining > 0) {
      this.userConnectionCount.set(userId, remaining);
      return;
    }
    this.userConnectionCount.delete(userId);

    const lastSeenAt = new Date();

    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeenAt },
    });

    const rooms = Array.from(client.rooms).filter((r) => r !== client.id);
    rooms.forEach((roomId) => {
      client.to(roomId).emit('user_offline', { userId, lastSeenAt });
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_chat')
  async joinChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = socket.data.user.sub;
    await this.assertParticipant(userId, data.chatId);
    socket.join(data.chatId);
    return { event: 'joined', data: { chatId: data.chatId } };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_chat')
  async leaveChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    await socket.leave(data.chatId);
    return { event: 'left', data: { chatId: data.chatId } };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = client.data.user.sub;
    const message = await this.chatService.sendMessage(
      userId,
      dto.chatId,
      dto,
    );

    this.server.to(dto.chatId).emit('new_message', message);

    return { event: 'message_sent', data: { id: message.id } };
  }

  async addUserToRoom(userId: string, chatId: string) {
    const sockets = await this.server.fetchSockets();
    for (const s of sockets) {
      if (s.data.user?.sub === userId) {
        s.join(chatId);
      }
    }
  }

  private async removeUserFromRoom(userId: string, chatId: string) {
    const sockets = await this.server.fetchSockets();
    for (const s of sockets) {
      if (s.data.user?.sub === userId) {
        s.leave(chatId);
        s.emit('removed_from_chat', { chatId });
      }
    }
  }

  private async assertParticipant(userId: string, chatId: string) {
    const participant = await this.prisma.participant.findUnique({
      where: {
        userId_chatId: {
          userId,
          chatId,
        },
      },
    });
    if (!participant) {
      throw new WsException('You are not a participant of this chat');
    }
  }
}
