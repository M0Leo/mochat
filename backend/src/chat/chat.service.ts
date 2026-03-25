// chat.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { PrismaService } from '@/prisma.service';
import { ChatResponseDto } from './dto/chat-response.dto';
import { plainToInstance } from 'class-transformer';
import { SendMessageDto } from './dto/send-message.dto';
import { Prisma } from '../../generated/prisma/browser';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async createChat(
    userId: string,
    dto: CreateChatDto,
  ): Promise<ChatResponseDto> {
    if (!dto.isGroup && dto.participants.length !== 1) {
      throw new BadRequestException(
        'DM chat must have exactly one participant',
      );
    }

    const participants = [...new Set([userId, ...dto.participants])];

    if (!dto.isGroup) {
      const existing = await this.prisma.chat.findFirst({
        where: {
          isGroup: false,
          participants: {
            every: {
              userId: { in: participants },
            },
          },
        },
        include: { participants: true },
      });

      if (existing && existing.participants.length === 2) {
        return plainToInstance(ChatResponseDto, existing);
      }
    }

    const chat = await this.prisma.chat.create({
      data: {
        isGroup: dto.isGroup,
        title: dto.title,
        participants: {
          create: participants.map((id) => ({
            userId: id,
          })),
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    return plainToInstance(ChatResponseDto, chat);
  }

  async getUserChats(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    //TODO: Turn to optimal response
    return chats;
  }

  async getChatById(chatId: string, userId: string) {
    const chat = this.prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    return plainToInstance(ChatResponseDto, chat);
  }

  async findDirectChat(userA: string, userB: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        isGroup: false,
        participants: {
          some: { userId: userA },
        },
        AND: {
          participants: {
            some: { userId: userB },
          },
        },
      },
      include: {
        participants: true,
      },
    });

    return chats.find((chat) => chat.participants.length === 2);
  }

  async addParticipants(chatId: string, dto: { userIds: string[] }) {
    return this.prisma.participant.createMany({
      data: dto.userIds.map((userId) => ({
        chatId,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  async ensureParticipant(userId: string, chatId: string) {
    const exists = await this.prisma.participant.findUnique({
      where: {
        userId_chatId: {
          userId,
          chatId,
        },
      },
    });

    if (!exists) {
      throw new Error('Forbidden');
    }
  }

  async sendMessage(data: Prisma.MessageCreateInput) {
    if (!data.content && !data.mediaUrl) {
      throw new BadRequestException('Message cannot be empty');
    }

    const message = await this.prisma.message.create({
      data,
    });

    return message;
  }

  async leaveChat(chatId: string, userId: string) {
    return this.prisma.participant.delete({
      where: {
        userId_chatId: {
          userId,
          chatId,
        },
      },
    });
  }
}
