import {
  IsEmail,
  IsEmpty,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 20)
  @Matches(/^[a-z0-9_]+$/)
  username: string;

  @IsString()
  @Length(3, 30)
  displayName: string;

  @IsString()
  @MinLength(8)
  password: string;

  @ValidateIf((o) => o.password !== o.confirmPassword)
  @IsNotEmpty()
  @IsEmpty({ message: 'confirmPassword must match password' })
  confirmPassword: string;
}
