import {
  Injectable,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import { ActionType } from '../generated/prisma/enums.js';
import { TripAccessService } from './trips-access.service.js';
import { CreateTripDto, EndTripDto } from './trips.dto.js';

@Injectable()
export class TripsService {
  constructor(
    private prisma: PrismaService,
    private activityLogsService: ActivityLogsService,
    private tripAccessService: TripAccessService,
  ) {}

  async create(dto: CreateTripDto, workerId: string) {
    // idempotent on clientId — safe if the worker's device retries this
    // after a dropped connection mid-sync
    const existing = await this.prisma.trip.findUnique({
      where: { clientId: dto.clientId },
    });
    if (existing) {
      if (existing.workerId !== workerId) {
        throw new ForbiddenException('You do not have access to this trip');
      }
      return existing;
    }

    // a worker shouldn't have two open trips at once
    const openTrip = await this.prisma.trip.findFirst({
      where: { workerId, endedAt: null },
    });
    if (openTrip) {
      throw new ConflictException(
        'You already have an open trip. End it before starting a new one.',
      );
    }

    return this.prisma.trip.create({
      data: {
        // the offline-generated UUID doubles as the server id, so pickups/sales
        // recorded offline can reference the trip before it has ever synced
        id: dto.clientId,
        clientId: dto.clientId,
        workerId,
        startedAt: new Date(dto.startedAt),
        createdAtClient: new Date(dto.createdAtClient),
      },
    });
  }

  async endTrip(tripId: string, dto: EndTripDto, workerId: string) {
    const trip = await this.tripAccessService.assertOwnership(tripId, workerId);

    if (trip.endedAt) return trip; // idempotent — already ended, no-op

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id: tripId },
        data: { endedAt: new Date(dto.endedAt) },
      });

      await this.activityLogsService.record(
        {
          clientId: `${tripId}-trip-ended`, // deterministic, since client doesn't send one for this action
          tripId,
          workerId,
          actionType: ActionType.TRIP_ENDED,
          payload: { endedAt: dto.endedAt },
          createdAtClient: dto.endedAt,
        },
        tx,
      );

      return updated;
    });
  }

  async findMine(workerId: string) {
    return this.prisma.trip.findMany({
      where: { workerId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.trip.findMany({ orderBy: { startedAt: 'desc' } });
  }
}
