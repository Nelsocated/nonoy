// activity-logs/activity-logs.service.ts

import type { Db } from "../db";
import { RecordActivityLogInput } from "../schemas/activity-logs";
import { Prisma } from "../generated/prisma/client";
export class ActivityLogsService {
  constructor(private prisma: Db) {}

  /**
   * Records one activity log entry. Idempotent on clientId — safe to call
   * multiple times with the same clientId (e.g. retried sync from an
   * unreliable connection) without creating duplicates.
   */
  async record(dto: RecordActivityLogInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.activityLog.upsert({
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
