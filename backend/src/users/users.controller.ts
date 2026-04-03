import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JWTGuard } from '@/auth/guards/jwt-token.guard';
import { UserResponseDto } from './dto/userResponse.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JWTGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  @ApiOkResponse({ description: 'Current user profile' })
  async me(@CurrentUser() curr) {
    const user = this.usersService.findOne({ id: curr.sub });
    return plainToInstance(UserResponseDto, user);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by username or display name' })
  @ApiQuery({ name: 'q', type: String, description: 'Prefix search query' })
  @ApiOkResponse({ description: 'Matching users (max 20)' })
  async search(@Query('q') q: string, @CurrentUser('sub') userId: string) {
    return this.usersService.searchUsers(q ?? '', userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ description: 'User profile' })
  async getUser(@Param('id') id: string) {
    const user = this.usersService.findOne({ id });
    return plainToInstance(UserResponseDto, user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user' })
  @ApiOkResponse({ description: 'Updated user profile' })
  async updateProfile(
    @CurrentUser('sub') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = this.usersService.updateUser({
      where: { id },
      data: { ...dto },
    });
    return plainToInstance(UserResponseDto, user);
  }
}
