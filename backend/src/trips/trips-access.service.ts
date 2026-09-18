import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class TripAccessService {
  constructor(private prisma: PrismaService) {}

  /**
   * Confirms `tripId` exists and belongs to `workerId`. Throws otherwise.
   * Pass `tx` when calling from inside another service's transaction.
   */
  async assertOwnership(
    tripId: string,
    workerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const trip = await client.trip.findUnique({ where: { id: tripId } });

    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.workerId !== workerId) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    return trip;
  }
}
