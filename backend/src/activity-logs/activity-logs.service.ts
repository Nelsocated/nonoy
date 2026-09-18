// activity-logs/activity-logs.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateActivityLogDto } from './activity-logs.dto.js';

@Injectable()
export class ActivityLogsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Records one activity log entry. Idempotent on clientId — safe to call
   * multiple times with the same clientId (e.g. retried sync from an
   * unreliable connection) without creating duplicates.
   */
  async record(dto: CreateActivityLogDto) {
    return this.prisma.activityLog.upsert({
      where: { clientId: dto.clientId },
      create: {
        clientId: dto.clientId,
        workerId: dto.workerId,
        tripId: dto.tripId,
        actionType: dto.actionType,
        payload: dto.payload,
        createdAtClient: new Date(dto.createdAtClient),
      },
      update: {}, // already exists — no-op, just confirms it's synced
    });
  }

  async getAll() {
    return this.prisma.activityLog.findMany();
  }
}
