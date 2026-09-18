import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { PickupsService } from './pickups.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.controller.js';
import { CreatePickupDto } from './pickups.dto.js';

@Controller('pickups')
export class PickupsController {
  constructor(private pickupsService: PickupsService) {}

  // Called during trip sync — worker's device pushes pickups recorded offline
  @Post()
  create(
    @Body() dto: CreatePickupDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.pickupsService.create(dto, req.user.id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get()
  getAll() {
    return this.pickupsService.getAll();
  }
}
