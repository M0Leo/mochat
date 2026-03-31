import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JWTGuard } from '@/auth/guards/jwt-token.guard';
import { UserResponseDto } from './dto/userResponse.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from './dto/update-user.dto';

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
    return plainToInstance(UserResponseDto, user);
  }

  @Get('search')
  async search(@Query('q') q: string, @CurrentUser('sub') userId: string) {
    return this.usersService.searchUsers(q ?? '', userId);
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = this.usersService.findOne({
      id,
    });
    return plainToInstance(UserResponseDto, user);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser('sub') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = this.usersService.updateUser({
      where: {
        id,
      },
      data: {
        ...dto,
      },
    });
    return plainToInstance(UserResponseDto, user);
  }
}
