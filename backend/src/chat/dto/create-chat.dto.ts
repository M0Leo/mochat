import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';

export class CreateChatDto {
  @IsBoolean()
  isGroup: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsArray()
  @ArrayMinSize(1)
  participants: string[];
}
