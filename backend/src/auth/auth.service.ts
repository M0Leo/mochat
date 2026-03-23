import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersService } from '@/users/users.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async signup(dto: SignUpDto) {
    const existedUser = await this.usersService.findOne({
      email: dto.email,
    });

    if (existedUser) {
      throw new UnauthorizedException('User already exist!');
    }

    const hash = await argon2.hash(dto.password);

    const user = await this.usersService.createUser({
      ...dto,
      password: hash,
    });

    return this.generateTokens(user.id, user.email);
  }

  async login(dto: SignInDto) {
    const user = await this.usersService.findOne({
      email: dto.email,
    });

    if (!user || !(await argon2.verify(user.password!, dto.password))) {
      throw new UnauthorizedException();
    }

    return this.generateTokens(user.id, user.email);
  }

  async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        privateKey: this.configService.getOrThrow('JWT_ACCESS_PRIVATE_KEY'),
        expiresIn: this.configService.getOrThrow('JWT_ACCESS_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        privateKey: this.configService.getOrThrow('JWT_REFRESH_PRIVATE_KEY'),
        expiresIn: this.configService.getOrThrow('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
