import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenGuard } from './guards/jwt-refresh-token.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'Returns tokens + user' })
  signup(@Body() dto: SignUpDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in' })
  @ApiCreatedResponse({ description: 'Returns tokens + user' })
  login(@Body() dto: SignInDto) {
    return this.authService.login(dto);
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiCreatedResponse({ description: 'Returns new token pair' })
  refresh(@Req() req) {
    const user = req.user;
    return this.authService.generateTokens(user.sub, user.email);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Log out' })
  @ApiCreatedResponse({ description: 'Logged out' })
  logout() {
    return { message: 'Logged out' };
  }
}
