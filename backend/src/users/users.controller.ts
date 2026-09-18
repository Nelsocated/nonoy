import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CreateUserDto } from './users.dto.js';
import { Throttle } from '@nestjs/throttler';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
