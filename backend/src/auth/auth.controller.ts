import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Public } from './decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { LocalAuthGuard } from './guard/local-auth.guard.js';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Req() req: Request & { user: AuthenticatedUser & { name: string } }) {
    return this.authService.login(req.user);
  }

  @Public()
  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  logout(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.authService.logout(req.user.id);
  }
}

// what JwtStrategy.validate puts on req.user
export type AuthenticatedUser = {
  id: string;
  role: string;
};
