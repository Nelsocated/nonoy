import { Controller, Post, Body, Req } from '@nestjs/common';
import { SyncService } from './sync.service.js';
import type { Request } from 'express';
import { SyncBatchDto } from './sync.dto.js';
import { AuthenticatedUser } from '../auth/auth.controller.js';

@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post()
  processBatch(
    @Body() dto: SyncBatchDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.syncService.processBatch(dto, req.user.id);
  }
}
