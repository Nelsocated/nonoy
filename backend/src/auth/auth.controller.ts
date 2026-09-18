import { Body, Controller, Post } from '@nestjs/common';
import { Public } from './decorators/public.decorator.js';
import { AuthDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private AuService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: AuthDto) {
    return this.AuService.login(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.AuService.refresh(refreshToken);
  }
}
