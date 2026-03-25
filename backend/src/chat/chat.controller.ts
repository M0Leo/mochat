// chat.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { JWTGuard } from '@/auth/guards/jwt-token.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('chats')
@UseGuards(JWTGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  createChat(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateChatDto,
  ) {
    return this.chatService.createChat(userId, dto);
  }

  @Get()
  getMyChats(@CurrentUser('userId') userId: string) {
    return this.chatService.getUserChats(userId);
  }

  @Get(':id')
  getChat(@Param('id') chatId: string, @CurrentUser('userId') userId: string) {
    return this.chatService.getChatById(chatId, userId);
  }

  @Delete(':id/leave')
  leaveChat(
    @Param('id') chatId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.leaveChat(chatId, userId);
  }
}
