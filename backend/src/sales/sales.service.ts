import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import {
  ActionType,
  BuyerRequestStatus,
  SyncStatus,
} from '../generated/prisma/enums.js';
import { TripAccessService } from '../trips/trips-access.service.js';
import { CreateSaleDto } from './sales.dto.js';
import { saleBuyerName } from '../buyer-requests/buyer-label.js';

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
    if (dto.buyerId && dto.buyerRequestId)
      throw new BadRequestException('Send either a buyer or a new buyer');

    const trip = await this.tripAccessService.assertOwnership(
      dto.tripId,
      workerId,
    );

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({
        where: { clientId: dto.clientId },
      });
      if (existing) return existing;

      // a new buyer the worker typed: once the owner decided, the sale gets
      // that buyer right away (rejected → walk-in). FOR SHARE waits for a
      // decision being made right now, so its sales update can't miss this one.
      let buyerId = dto.buyerId ?? null;
      if (dto.buyerRequestId) {
        const [request] = await tx.$queryRaw<
          {
            requestedById: string;
            status: BuyerRequestStatus;
            buyerId: string | null;
          }[]
        >`SELECT "requestedById", status::text AS status, "buyerId"
          FROM buyer_requests WHERE id = ${dto.buyerRequestId} FOR SHARE`;
        if (!request || request.requestedById !== workerId)
          throw new NotFoundException('Buyer request not found');
        if (
          request.status === BuyerRequestStatus.APPROVED ||
          request.status === BuyerRequestStatus.MERGED
        )
          buyerId = request.buyerId;
      }

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
          buyerId,
          buyerRequestId: dto.buyerRequestId ?? null,
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
            buyerId,
            buyerRequestId: dto.buyerRequestId,
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

  // one sale for the owner's receipt screen; archived buyers keep their name
  async receipt(clientId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { clientId },
      include: {
        buyer: { select: { name: true } },
        buyerRequest: { select: { name: true, status: true } },
        trip: { select: { worker: { select: { name: true } } } },
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');

    return {
      clientId: sale.clientId,
      tripId: sale.tripId,
      createdAtClient: sale.createdAtClient,
      workerName: sale.trip.worker.name,
      buyerName: saleBuyerName(sale.buyer, sale.buyerRequest),
      chickenCount: sale.chickenCount,
      totalKilo: sale.totalKilo.toFixed(2),
      pricePerKilo: sale.pricePerKilo?.toFixed(2) ?? null,
      amount: sale.amount.toFixed(2),
      paymentMethod: sale.paymentMethod,
    };
  }
}
