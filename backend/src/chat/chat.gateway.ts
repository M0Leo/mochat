import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { UseGuards } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { MessageType } from '../../generated/prisma/enums';

@WebSocketGateway(8000, {
  cors: {
    origin: 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/chats',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly chatService: ChatService) {}

  @WebSocketServer()
  private server: Server;

  async handleConnection(socket: Socket) {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      socket.disconnect();
      //TODO: Handle error message to client
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:join')
  async joinChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    socket.join(data.chatId);
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:leave')
  async leaveChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    socket.leave(data.chatId);
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:new')
  async handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      chatId: string;
      content: string;
      type: string;
    },
  ) {
    const user = socket.data.user;
    const message = await this.chatService.sendMessage(
      user.userId,
      data.chatId,
      {
        type: data.type as MessageType,
        content: data.content,
      },
    );

    this.server.to(data.chatId).emit('message:new', message);
    return message;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:created')
  async handleCreateChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() dto,
  ) {
    const user = socket.data.user;

    const chat = await this.chatService.createChat(user.userId, dto);

    chat.participants.forEach((p) => {
      this.server.to(p.userId).emit('chat:created', chat);
    });

    return chat;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:participant_joined')
  async handleJoinParticipant(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { chatId: string; userId: string },
  ) {
    const newUser = await this.chatService.addParticipants(data.chatId, {
      userIds: [data.userId],
    });

    this.server.to(data.chatId).emit('chat:participant_joined', {
      chatId: data.chatId,
      user: newUser,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:participant_left')
  async handleLeaveParticipant(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const user = socket.data.user;

    this.server.to(data.chatId).emit('chat:participant_left', {
      chatId: data.chatId,
      userId: user.userId,
    });
  }

  handleDisconnect(socket: Socket) {
    const user = socket.data?.user;

    if (user) {
      this.server.emit('user:online', {
        userId: user.userId,
        isOnline: false,
        lastSeen: new Date(),
      });
    }
  }
}
