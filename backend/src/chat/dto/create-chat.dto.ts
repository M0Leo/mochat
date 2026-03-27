import {
  IsArray,
  IsOptional,
  IsString,
  ArrayMinSize,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { ChatType } from '../../../generated/prisma/enums';

export class CreateChatDto {
  @IsNotEmpty()
  @IsEnum(ChatType, {
    message: "chat type must be one of the following values: DIRECT, PRIVATE_GROUP, PUBLIC_GROUP"
  })
  type: ChatType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  participants: string[];
}
