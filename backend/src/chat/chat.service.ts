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
import { ChatType } from '../../generated/prisma/browser';
import { Chat } from '../../generated/prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async createChat(userId: string, dto: CreateChatDto) {
    if (dto.type === ChatType.DIRECT) {
      return this.createDirectChat(userId, dto.participants);
    }

    return this.createGroupChat(userId, dto);
  }

  private async createDirectChat(userId: string, participants: string[] = []) {
    const uniqueParticipants = Array.from(new Set([userId, ...participants]));
    if (uniqueParticipants.length !== 2) {
      throw new BadRequestException('Direct chat must have exactly 2 users');
    }

    const [userA, userB] = uniqueParticipants.sort();
    const existing = await this.prisma.chat.findFirst({
      where: {
        type: 'DIRECT',
        participants: {
          every: {
            userId: { in: [userA, userB] },
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (existing && existing.participants.length === 2) {
      return existing;
    }

    return this.prisma.chat.create({
      data: {
        type: 'DIRECT',
        participants: {
          create: [{ userId: userA }, { userId: userB }],
        },
      },
      include: this.defaultInclude(),
    });
  }

  private async createGroupChat(userId: string, dto: CreateChatDto) {
    const { type, participants = [], title } = dto;

    const uniqueParticipants = Array.from(new Set([userId, ...participants]));

    if (uniqueParticipants.length < 2) {
      throw new BadRequestException('Group chat must have at least 2 users');
    }

    if (!title) {
      throw new BadRequestException('Group chat must have a title');
    }

    return this.prisma.chat.create({
      data: {
        type,
        title,
        participants: {
          create: uniqueParticipants.map((id) => ({
            userId: id,
          })),
        },
      },
      include: this.defaultInclude(),
    });
  }

  private defaultInclude() {
    return {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
    };
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
          include: {
            user: {
              select: {
                displayName: true,
                id: true,
                isOnline: true,
              },
            },
          },
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
    return chats.map((chat: Chat) => this.mapChat(chat, userId));
  }

  private mapChat(chat: any, currentUserId: string) {
    const users = chat.participants.map((p) => p.user);

    return {
      id: chat.id,
      type: chat.type,
      title: chat.title,
      participants: users,
      createdAt: chat.createdAt,
    };
  }

  async getMessages(
    userId: string,
    chatId: string,
    cursor?: string,
    limit = 50,
  ) {
    const participant = await this.prisma.participant.findUnique({
      where: {
        userId_chatId: {
          chatId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not part of this chat');
    }

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    let nextCursor: string | undefined = undefined;

    if (messages.length > limit) {
      const next = messages.pop();
      nextCursor = next?.id;
    }

    return {
      messages,
      nextCursor,
    };
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
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return plainToInstance(ChatResponseDto, chat);
  }

  async findDirectChat(userA: string, userB: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        type: 'DIRECT',
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
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
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

  async sendMessage(senderId: string, chatId: string, dto: SendMessageDto) {
    const participant = await this.prisma.participant.findUnique({
      where: {
        userId_chatId: {
          chatId,
          userId: senderId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not part of this chat');
    }

    if (!dto.content && !dto.mediaUrl) {
      throw new BadRequestException('Message cannot be empty');
    }

    const message = await this.prisma.message.create({
      data: {
        content: dto.content,
        msgType: dto.type,
        mediaUrl: dto.mediaUrl,
        senderId,
        chatId,
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
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
