import { Exclude } from 'class-transformer';
import { User } from '../../../generated/prisma/client';

export class UserResponseDto implements User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
  bio: string | null;
  phone: string | null;
  isOnline: boolean;
  addressId: number;

  @Exclude()
  password: string;
}
