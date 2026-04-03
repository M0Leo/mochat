import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../../../generated/prisma/enums';

export class SendMessageDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  chatId: string;

  @ApiPropertyOptional({ example: 'Hello!' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ enum: MessageType, example: MessageType.TEXT })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}
