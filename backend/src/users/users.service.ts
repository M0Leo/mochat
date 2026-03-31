import { Injectable } from '@nestjs/common';
import { UserWhereUniqueInput } from '../../generated/prisma/models';
import { Prisma, User } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(
    userWhereUniqueInput: UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
    select?: Prisma.UserSelect;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy, select } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      select,
    });
  }

  async searchUsers(query: string, userId?: string) {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return this.prisma.user.findMany({
      where: {
        AND: [
          ...(userId ? [{ id: { not: userId } }] : []),
          {
            OR: [
              { username: { startsWith: trimmed, mode: 'insensitive' } },
              { displayName: { startsWith: trimmed, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: 20,
      select: {
        id: true,
        username: true,
        displayName: true,
      },
      orderBy: { username: 'asc' },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return this.prisma.user.update({
      data,
      where,
    });
  }
  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({
      where,
    });
  }
}
