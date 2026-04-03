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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { JWTGuard } from '@/auth/guards/jwt-token.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

@ApiTags('Chats')
@ApiBearerAuth()
@UseGuards(JWTGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({
    summary: 'Create or return existing chat',
    description:
      'For DIRECT chats, returns the existing chat if one already exists between the two participants.',
  })
  @ApiCreatedResponse({ description: 'Chat object with participants' })
  createChat(@CurrentUser('sub') userId: string, @Body() dto: CreateChatDto) {
    return this.chatService.createChat(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List current user's chats" })
  @ApiOkResponse({ description: 'Array of chats, sorted by last message' })
  getMyChats(@CurrentUser('sub') userId: string) {
    return this.chatService.getUserChats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get chat with messages' })
  @ApiOkResponse({ description: 'Chat with message history' })
  getChat(@Param('id') chatId: string, @CurrentUser('sub') userId: string) {
    return this.chatService.getChatById(chatId, userId);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message via REST' })
  @ApiCreatedResponse({ description: 'Created message with sender info' })
  sendMessage(
    @Param('id') chatId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, chatId, dto);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get messages (cursor pagination)' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Messages + nextCursor' })
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
  @ApiOperation({ summary: 'Leave a chat' })
  @ApiOkResponse({ description: 'Deleted participant record' })
  leaveChat(@Param('id') chatId: string, @CurrentUser('sub') userId: string) {
    return this.chatService.leaveChat(chatId, userId);
  }
}
