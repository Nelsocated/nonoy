import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import type { Request } from 'express';
import { CreateActivityLogDto } from './activity-logs.dto.js';

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private activityLogsService: ActivityLogsService) {}

  // Called during offline sync — a worker's device pushes up whatever
  // logs it accumulated while offline. Idempotent via clientId upsert,
  // so retried/duplicate submissions are safe.
  @Post()
  record(@Body() dto: CreateActivityLogDto) {
    return this.activityLogsService.record(dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get()
  findAll() {
    return this.activityLogsService.getAll();
  }
}
