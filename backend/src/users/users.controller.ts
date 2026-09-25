import { Body, Controller, ForbiddenException, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { UsersService } from './users.service.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/auth.controller.js';
import { AdminCreateUserDto, CreateUserDto } from './users.dto.js';

// Which roles each role may create. ADMIN (runs the system) can create
// anyone; OWNER (runs the business) only hires workers.
const CAN_CREATE: Partial<Record<Role, Role[]>> = {
  [Role.ADMIN]: [Role.ADMIN, Role.OWNER, Role.WORKER],
  [Role.OWNER]: [Role.WORKER],
};

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // public sign-up — always creates a WORKER
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Post()
  create(
    @Body() dto: AdminCreateUserDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    const allowed = CAN_CREATE[req.user.role as Role] ?? [];
    if (!allowed.includes(dto.role)) {
      throw new ForbiddenException(
        `${req.user.role} cannot create ${dto.role} accounts`,
      );
    }
    const { role, ...rest } = dto;
    return this.usersService.create(rest, role);
  }
}
