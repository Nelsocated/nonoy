import { BadRequestException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import { ActionType, SyncStatus } from '../generated/prisma/enums.js';
import { TripAccessService } from '../trips/trips-access.service.js';
import { CreateSaleDto } from './sales.dto.js';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private activityLogsService: ActivityLogsService,
    private tripAccessService: TripAccessService,
  ) {}

  async create(dto: CreateSaleDto, workerId: string) {
    // the phone computes amount = kilos × price (half-up to the centavo);
    // anything else means a bug or tampering, so don't store it
    if (
      dto.pricePerKilo &&
      !new Decimal(dto.totalKilo)
        .times(dto.pricePerKilo)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .equals(dto.amount)
    ) {
      throw new BadRequestException("amount doesn't match kilos × price");
    }

    const trip = await this.tripAccessService.assertOwnership(
      dto.tripId,
      workerId,
    );

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({
        where: { clientId: dto.clientId },
      });
      if (existing) return existing;

      // a sale can't happen on a trip that's already been closed out — flag it
      // for owner review rather than rejecting, so no field data is lost
      let syncStatus: SyncStatus = SyncStatus.SYNCED;
      let conflictReason: string | null = null;

      if (trip.endedAt && new Date(dto.createdAtClient) > trip.endedAt) {
        syncStatus = SyncStatus.CONFLICT;
        conflictReason = 'Sale was recorded after its trip had ended';
      }

      const sale = await tx.sale.create({
        data: {
          clientId: dto.clientId,
          tripId: dto.tripId,
          buyerId: dto.buyerId,
          chickenCount: dto.chickenCount,
          totalKilo: dto.totalKilo,
          amount: dto.amount,
          pricePerKilo: dto.pricePerKilo,
          listPricePerKilo: dto.listPricePerKilo,
          paymentMethod: dto.paymentMethod,
          createdAtClient: new Date(dto.createdAtClient),
          syncStatus,
          conflictReason,
        },
      });

      await this.activityLogsService.record(
        {
          clientId: dto.activityLogClientId,
          tripId: dto.tripId,
          workerId,
          actionType: ActionType.SALE_RECORDED,
          payload: {
            saleId: sale.id,
            buyerId: dto.buyerId,
            chickenCount: dto.chickenCount,
            totalKilo: dto.totalKilo,
            amount: dto.amount,
            paymentMethod: dto.paymentMethod ?? 'CASH',
            syncStatus,
          },
          createdAtClient: dto.createdAtClient,
        },
        tx,
      );

      return sale;
    });
  }

  async getAll() {
    return this.prisma.sale.findMany();
  }

  async findConflicted() {
    return this.prisma.sale.findMany({
      where: { syncStatus: SyncStatus.CONFLICT },
      orderBy: { createdAtClient: 'desc' },
    });
  }
}
