import { NotFoundException, ForbiddenException } from "../errors";
import type { Db } from "../db";
import type { Prisma } from "../generated/prisma/client";
export class TripAccessService {
  constructor(private prisma: Db) {}

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

    if (!trip) throw new NotFoundException("Trip not found");
    if (trip.workerId !== workerId) {
      throw new ForbiddenException("You do not have access to this trip");
    }

    return trip;
  }
}
