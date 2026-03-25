import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 20)
  @Matches(/^[a-z0-9_]+$/)
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}
