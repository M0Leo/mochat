import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  name: string;

  @IsString()
  @MinLength(8)
  password: string;
}
