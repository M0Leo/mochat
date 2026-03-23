import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JWTStrategy } from '@/auth/strategies/jwt.strategy';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JWTStrategy)
  async getUsers(@CurrentUser() user) {
    console.log(user);
    return this.usersService.findMany({});
  }
}
