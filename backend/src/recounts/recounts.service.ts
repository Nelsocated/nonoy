import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import { ActionType } from '../generated/prisma/enums.js';
import { TripAccessService } from '../trips/trips-access.service.js';
import { CreateRecountDto } from './recounts.dto.js';
import { Decimal } from '@prisma/client/runtime/client';

@Injectable()
export class RecountsService {
  constructor(
    private prisma: PrismaService,
    private activityLogsService: ActivityLogsService,
    private tripAccessService: TripAccessService,
  ) {}

  async create(dto: CreateRecountDto, workerId: string) {
    // confirms tripId exists AND belongs to this worker before anything else runs
    await this.tripAccessService.assertOwnership(dto.tripId, workerId);

    return this.prisma.$transaction(async (tx) => {
      // idempotent re-fetch if this exact recount was already synced
      const existing = await tx.recount.findUnique({
        where: { clientId: dto.clientId },
      });
      if (existing) return existing;

      // Sum everything picked up and sold on this trip up to the moment of the
      // count — the "expected" baseline the worker's physical count gets checked
      // against. Records made after it (often synced in the same batch) don't count.
      const where = {
        tripId: dto.tripId,
        createdAtClient: { lte: new Date(dto.createdAtClient) },
      };
      const [pickups, sales] = await Promise.all([
        tx.pickup.aggregate({
          where,
          _sum: { chickenCount: true, totalKilo: true },
        }),
        tx.sale.aggregate({
          where,
          _sum: { chickenCount: true, totalKilo: true },
        }),
      ]);

      const pickedChicken = pickups._sum.chickenCount ?? 0;
      const pickedKilo = pickups._sum.totalKilo ?? new Decimal(0);
      const soldChicken = sales._sum.chickenCount ?? 0;
      const soldKilo = sales._sum.totalKilo ?? new Decimal(0);

      const expectedChicken = pickedChicken - soldChicken;
      const expectedKilo = pickedKilo.minus(soldKilo);

      const discrepancyFlagged =
        dto.countedChicken !== expectedChicken ||
        !new Decimal(dto.countedKilo).equals(expectedKilo);

      const recount = await tx.recount.create({
        data: {
          clientId: dto.clientId,
          tripId: dto.tripId,
          countedChicken: dto.countedChicken,
          countedKilo: dto.countedKilo,
          expectedChicken,
          expectedKilo,
          discrepancyFlagged,
          createdAtClient: new Date(dto.createdAtClient),
        },
      });

      await this.activityLogsService.record(
        {
          clientId: dto.activityLogClientId,
          tripId: dto.tripId,
          workerId,
          actionType: ActionType.RECOUNT_PERFORMED,
          payload: {
            recountId: recount.id,
            countedChicken: dto.countedChicken,
            countedKilo: dto.countedKilo,
            expectedChicken,
            expectedKilo: expectedKilo.toString(),
            discrepancyFlagged,
          },
          createdAtClient: dto.createdAtClient,
        },
        tx,
      );

      return recount;
    });
  }

  async getAll() {
    return this.prisma.recount.findMany();
  }
}
