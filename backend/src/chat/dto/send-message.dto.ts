import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MessageType } from '../../../generated/prisma/enums';

export class SendMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsEnum(MessageType)
  type: MessageType;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}
