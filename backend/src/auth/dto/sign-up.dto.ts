import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateIf,
  IsEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'john_doe1', minLength: 6, maxLength: 20 })
  @IsString()
  @Length(6, 20)
  @Matches(/^[a-z0-9_]+$/)
  username: string;

  @ApiProperty({ example: 'John Doe', minLength: 3, maxLength: 30 })
  @IsString()
  @Length(3, 30)
  displayName: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'password123' })
  @ValidateIf((o) => o.password !== o.confirmPassword)
  @IsNotEmpty()
  @IsEmpty({ message: 'confirmPassword must match password' })
  confirmPassword: string;
}
