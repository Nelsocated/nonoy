import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { UsersService } from './users.service.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/auth.controller.js';
import {
  AdminCreateUserDto,
  CreateUserDto,
  ResetPasswordDto,
  SetActiveDto,
  UpdateUserDto,
} from './users.dto.js';

// Which roles each role may create, list and manage. Owner and admin share
// one UI and the same powers (decided 2026-09-26).
const CAN_MANAGE: Partial<Record<Role, Role[]>> = {
  [Role.ADMIN]: [Role.ADMIN, Role.OWNER, Role.WORKER],
  [Role.OWNER]: [Role.ADMIN, Role.OWNER, Role.WORKER],
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
    const allowed = CAN_MANAGE[req.user.role as Role] ?? [];
    if (!allowed.includes(dto.role)) {
      throw new ForbiddenException(
        `${req.user.role} cannot create ${dto.role} accounts`,
      );
    }
    const { role, ...rest } = dto;
    return this.usersService.create(rest, role);
  }

  // the logged-in user's own profile
  @Get('me')
  me(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.usersService.getProfile(req.user.id);
  }

  // ADMIN sees everyone; OWNER sees workers
  @Roles(Role.OWNER, Role.ADMIN)
  @Get()
  list(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.usersService.list(CAN_MANAGE[req.user.role as Role] ?? []);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Patch(':id/active')
  async setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetActiveDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    if (id === req.user.id) {
      // stops the last admin from locking everyone out
      throw new ForbiddenException('You cannot change your own active status');
    }
    await this.assertCanManage(id, req.user);
    return this.usersService.setActive(id, dto.isActive);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    await this.assertCanManage(id, req.user);
    return this.usersService.update(id, dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Patch(':id/password')
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    if (id === req.user.id) {
      throw new ForbiddenException('You cannot reset your own password here');
    }
    await this.assertCanManage(id, req.user);
    return this.usersService.resetPassword(id, dto.password);
  }

  private async assertCanManage(id: string, me: AuthenticatedUser) {
    const target = await this.usersService.getProfile(id);
    const allowed = CAN_MANAGE[me.role as Role] ?? [];
    if (!allowed.includes(target.role)) {
      throw new ForbiddenException(
        `${me.role} cannot manage ${target.role} accounts`,
      );
    }
  }
}
