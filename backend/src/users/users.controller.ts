import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JWTGuard } from '@/auth/guards/jwt-token.guard';
import { UserResponseDto } from './dto/userResponse.dto';
import { plainToClass } from 'class-transformer';

@Controller('users')
@UseGuards(JWTGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() curr) {
    const user = this.usersService.findOne({
      id: curr.sub,
    });
    return plainToClass(UserResponseDto, user);
  }

  @Get('/friends')
  async getFriends(@CurrentUser() curr) {
    return;
  }
}
