// chat.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { PrismaService } from '@/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatType, MessageType } from '../../generated/prisma/browser';

const CHAT_PARTICIPANT_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isOnline: true,
} as const;

const MESSAGE_SENDER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

const CHAT_INCLUDE = {
  participants: {
    include: {
      user: {
        select: CHAT_PARTICIPANT_SELECT,
      },
    },
  },
} as const;

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  private toChatResponse(chat: {
    id: string;
    type: ChatType;
    title: string | null;
    lastMessageAt: Date | null;
    createdAt: Date;
    participants: { user: Record<string, unknown> }[];
  }) {
    return {
      id: chat.id,
      type: chat.type,
      title: chat.title,
      lastMessageAt: chat.lastMessageAt,
      createdAt: chat.createdAt,
      participants: chat.participants.map((p) => p.user),
    };
  }

  async createChat(userId: string, dto: CreateChatDto) {
    if (dto.type === ChatType.DIRECT) {
      const chat = await this.createDirectChat(userId, dto.participants);
      return this.toChatResponse(chat);
    }

    const chat = await this.createGroupChat(userId, dto);
    return this.toChatResponse(chat);
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
      include: CHAT_INCLUDE,
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
      include: CHAT_INCLUDE,
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
      include: CHAT_INCLUDE,
    });
  }

  async getDMUsers(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        type: 'DIRECT',
        participants: { some: { userId } },
      },
      include: CHAT_INCLUDE,
    });

    const usersMap = new Map<string, (typeof chats)[0]['participants'][0]['user']>();

    for (const chat of chats) {
      for (const p of chat.participants) {
        if (p.userId !== userId) {
          usersMap.set(p.user.id, p.user);
        }
      }
    }

    return Array.from(usersMap.values());
  }

  async getUserChats(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: CHAT_INCLUDE,
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    });

    return chats.map((chat) => this.toChatResponse(chat));
  }

  async getMessages(
    userId: string,
    chatId: string,
    cursor?: string,
    limit = 50,
  ) {
    await this.assertParticipant(userId, chatId);

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      include: {
        sender: { select: MESSAGE_SENDER_SELECT },
      },
    });

    let nextCursor: string | undefined = undefined;

    if (messages.length > limit) {
      const next = messages.pop();
      nextCursor = next?.id;
    }

    return { messages, nextCursor };
  }

  async getChatById(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: { some: { userId } },
      },
      include: {
        ...CHAT_INCLUDE,
        messages: {
          include: {
            sender: { select: MESSAGE_SENDER_SELECT },
          },
        },
      },
    });

    if (!chat) return null;

    return {
      ...this.toChatResponse(chat),
      messages: chat.messages,
    };
  }

  async findDirectChat(userA: string, userB: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        type: 'DIRECT',
        participants: { some: { userId: userA } },
        AND: {
          participants: { some: { userId: userB } },
        },
      },
      include: CHAT_INCLUDE,
    });

    const chat = chats.find((c) => c.participants.length === 2);
    return chat ? this.toChatResponse(chat) : null;
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

  private MESSAGE_INCLUDE = {
    sender: {
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    },
  } as const;

  private async assertParticipant(
    userId: string,
    chatId: string,
  ): Promise<void> {
    const participant = await this.prisma.participant.findUnique({
      where: { userId_chatId: { userId, chatId } },
      select: { userId: true },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this chat');
    }
  }

  private normalizeMessageType(dto: SendMessageDto): MessageType {
    if (dto.mediaUrl && dto.type === MessageType.TEXT) {
      return MessageType.FILE;
    }
    return dto.type;
  }

  async sendMessage(
    senderId: string,
    chatId: string,
    dto: SendMessageDto,
  ) {
    const content = dto.content?.trim();

    if (!content && !dto.mediaUrl) {
      throw new BadRequestException('Message cannot be empty');
    }

    await this.assertParticipant(senderId, chatId);

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          content: content || null,
          msgType: this.normalizeMessageType(dto),
          mediaUrl: dto.mediaUrl,
          senderId,
          chatId,
        },
        include: this.MESSAGE_INCLUDE,
      }),
      this.prisma.chat.update({
        where: { id: chatId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    return message;
  }

  async leaveChat(chatId: string, userId: string) {
    await this.assertParticipant(userId, chatId);

    return this.prisma.participant.delete({
      where: { userId_chatId: { userId, chatId } },
    });
  }

  async getPublicGroups(excludeUserId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        type: 'PUBLIC_GROUP',
        participants: { none: { userId: excludeUserId } },
      },
      include: CHAT_INCLUDE,
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    console.log(chats);
    return chats.map((chat) => this.toChatResponse(chat));
  }

  async joinChat(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { type: true },
    });

    if (!chat || chat.type !== 'PUBLIC_GROUP') {
      throw new ForbiddenException('Cannot join this chat');
    }

    const existing = await this.prisma.participant.findUnique({
      where: { userId_chatId: { userId, chatId } },
    });

    if (existing) {
      return this.getChatById(chatId, userId);
    }

    const updated = await this.prisma.chat.update({
      where: { id: chatId },
      data: {
        participants: { create: { userId } },
      },
      include: CHAT_INCLUDE,
    });
    return this.toChatResponse(updated);
  }
}
