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

@WebSocketGateway(8000, {
  cors: true,
  namespace: '/chats',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly chatsService: ChatService) {}

  @WebSocketServer()
  private server: Server;

  async handleConnection(socket: Socket) {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];
    console.log(token);
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
    const user = socket.data.user;

    await this.chatsService.ensureParticipant(user.userId, data.chatId);

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
  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      chatId: string;
      content: string;
    },
  ) {
    const user = socket.data.user;

    await this.chatsService.ensureParticipant(user.userId, data.chatId);

    const message = await this.chatsService.sendMessage({
      chat: {
        connect: {
          id: data.chatId,
        },
      },
      sender: user.userId,
      content: data.content,
      msgType: 'TEXT',
    });

    this.server.to(data.chatId).emit('chat:message', message);
    return message;
  }

  handleDisconnect(socket: Socket) {
    socket.disconnect();
  }
}
