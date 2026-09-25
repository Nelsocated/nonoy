import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import type { Request } from 'express';
import { CreateActivityLogDto } from './activity-logs.dto.js';
import type { AuthenticatedUser } from '../auth/auth.controller.js';
import { TripAccessService } from '../trips/trips-access.service.js';

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(
    private activityLogsService: ActivityLogsService,
    private tripAccessService: TripAccessService,
  ) {}

  // Called during offline sync — a worker's device pushes up whatever
  // logs it accumulated while offline. Idempotent via clientId upsert,
  // so retried/duplicate submissions are safe.
  @Post()
  async record(
    @Body() dto: CreateActivityLogDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    if (dto.tripId) {
      await this.tripAccessService.assertOwnership(dto.tripId, req.user.id);
    }
    return this.activityLogsService.record({ ...dto, workerId: req.user.id });
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get()
  findAll() {
    return this.activityLogsService.getAll();
  }
}
