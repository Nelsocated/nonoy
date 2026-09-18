import { Controller, Get, Post, Patch, Body, Param, Req } from '@nestjs/common';
import { TripsService } from './trips.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import type { Request } from 'express';
import { CreateTripDto, EndTripDto } from './trips.dto.js';
import { AuthenticatedUser } from '../auth/auth.controller.js';

@Controller('trips')
export class TripsController {
  constructor(private tripsService: TripsService) {}

  @Post()
  create(
    @Body() dto: CreateTripDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.tripsService.create(dto, req.user.id);
  }

  @Patch(':id/end')
  endTrip(
    @Param('id') id: string,
    @Body() dto: EndTripDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.tripsService.endTrip(id, dto, req.user.id);
  }

  // worker checking their own trip history
  @Get('me')
  findMine(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.tripsService.findMine(req.user.id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get()
  findAll() {
    return this.tripsService.findAll();
  }
}
