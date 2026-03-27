// chat.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { JWTGuard } from '@/auth/guards/jwt-token.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chats')
@UseGuards(JWTGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  createChat(@CurrentUser('sub') userId: string, @Body() dto: CreateChatDto) {
    return this.chatService.createChat(userId, dto);
  }

  @Get()
  getMyChats(@CurrentUser('sub') userId: string) {
    return this.chatService.getUserChats(userId);
  }

  @Get(':id')
  getChat(@Param('id') chatId: string, @CurrentUser('userId') userId: string) {
    return this.chatService.getChatById(chatId, userId);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') chatId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, chatId, dto);
  }

  @Get(':id/messages')
  getMessages(
    @CurrentUser('sub') userId,
    @Param('id') chatId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      userId,
      chatId,
      cursor,
      limit ? Number(limit) : 50,
    );
  }

  @Delete(':id/leave')
  leaveChat(
    @Param('id') chatId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.leaveChat(chatId, userId);
  }
}
