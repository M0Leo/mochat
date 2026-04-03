import {
  IsArray,
  IsOptional,
  IsString,
  ArrayMinSize,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatType } from '../../../generated/prisma/enums';

export class CreateChatDto {
  @ApiProperty({ enum: ChatType, example: ChatType.DIRECT })
  @IsNotEmpty()
  @IsEnum(ChatType, {
    message:
      'chat type must be one of: DIRECT, PRIVATE_GROUP, PUBLIC_GROUP',
  })
  type: ChatType;

  @ApiPropertyOptional({ example: 'My Group' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  participants: string[];
}
