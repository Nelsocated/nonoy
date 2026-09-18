import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import { ActionType } from '../generated/prisma/enums.js';
import { CreatePickupDto } from './pickups.dto.js';

@Injectable()
export class PickupsService {
  constructor(
    private prisma: PrismaService,
    private activityLogsService: ActivityLogsService,
  ) {}

  async create(dto: CreatePickupDto, workerId: string) {
    return this.prisma.$transaction(async (tx) => {
      // idempotent on clientId — safe if the worker's device retries this
      // after a dropped connection mid-sync
      const pickup = await tx.pickup.upsert({
        where: { clientId: dto.clientId },
        create: {
          clientId: dto.clientId,
          tripId: dto.tripId,
          plantationId: dto.plantationId,
          chickenCount: dto.chickenCount,
          totalKilo: dto.totalKilo,
          createdAtClient: new Date(dto.createdAtClient),
        },
        update: {}, // already synced, no-op
      });

      await this.activityLogsService.record(
        {
          clientId: dto.activityLogClientId,
          tripId: dto.tripId,
          workerId,
          actionType: ActionType.PICKUP_STARTED,
          payload: {
            pickupId: pickup.id,
            plantationId: dto.plantationId,
            chickenCount: dto.chickenCount,
            totalKilo: dto.totalKilo,
          },
          createdAtClient: dto.createdAtClient,
        },
        tx, // pass the transaction client through, see note below
      );

      return pickup;
    });
  }

  async getAll() {
    return this.prisma.pickup.findMany();
  }
}
