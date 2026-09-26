import { Injectable, Logger } from '@nestjs/common';
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
} from '@prisma/client/runtime/client';
import { TripsService } from '../trips/trips.service.js';
import { PickupsService } from '../pickups/pickups.service.js';
import { SalesService } from '../sales/sales.service.js';
import { RecountsService } from '../recounts/recounts.service.js';
import { ExpensesService } from '../expenses/expenses.service.js';
import { BuyerRequestsService } from '../buyer-requests/buyer-requests.service.js';
import { SyncBatchDto } from './sync.dto.js';

type SyncResult = {
  clientId: string;
  status: 'ok' | 'error';
  serverId?: string;
  error?: string;
};

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private tripsService: TripsService,
    private pickupsService: PickupsService,
    private salesService: SalesService,
    private recountsService: RecountsService,
    private expensesService: ExpensesService,
    private buyerRequestsService: BuyerRequestsService,
  ) {}

  async processBatch(dto: SyncBatchDto, workerId: string) {
    const results = {
      trips: [] as SyncResult[],
      tripEndings: [] as SyncResult[],
      buyerRequests: [] as SyncResult[],
      pickups: [] as SyncResult[],
      sales: [] as SyncResult[],
      recounts: [] as SyncResult[],
      expenses: [] as SyncResult[],
    };

    // Endings for trips created in an EARLIER batch go before new trips: a
    // worker who ended yesterday's trip and started today's while offline
    // would otherwise hit "one open trip per worker" on the new one.
    // (Records can still attach to an ended trip, so this order is safe: a
    // sale is only flagged if it was made after its trip's end.)
    const newTripIds = new Set((dto.trips ?? []).map((t) => t.clientId));
    const [earlierEndings, sameBatchEndings] = partition(
      dto.tripEndings ?? [],
      (e) => !newTripIds.has(e.tripId),
    );
    for (const item of earlierEndings) {
      results.tripEndings.push(
        await this.safely(item.tripId, () =>
          this.tripsService.endTrip(item.tripId, item, workerId),
        ),
      );
    }

    // Trips MUST go first — pickups/sales/recounts all reference a tripId,
    // and if the trip itself hasn't synced yet, everything downstream fails
    // its ownership/existence check.
    // Sequential, not Promise.all — two trips in one batch would otherwise
    // race the "one open trip per worker" check. In start order, and a trip
    // followed by another one in this batch (two trips in one offline day) is
    // ended right away, or the next one hits "one open trip per worker" too.
    const trips = [...(dto.trips ?? [])].sort(
      (a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || 0,
    );
    const endingOf = new Map(sameBatchEndings.map((e) => [e.tripId, e]));
    for (const [i, item] of trips.entries()) {
      results.trips.push(
        await this.safely(item.clientId, () =>
          this.tripsService.create(item, workerId),
        ),
      );
      const ending = endingOf.get(item.clientId);
      if (ending && i < trips.length - 1) {
        endingOf.delete(item.clientId);
        results.tripEndings.push(
          await this.safely(ending.tripId, () =>
            this.tripsService.endTrip(ending.tripId, ending, workerId),
          ),
        );
      }
    }

    // New buyers a worker typed go before sales: a sale points at its request
    results.buyerRequests = await Promise.all(
      (dto.buyerRequests ?? []).map((item) =>
        this.safely(item.id, () =>
          this.buyerRequestsService.create(item, workerId),
        ),
      ),
    );

    // Pickups and sales don't depend on each other, but both need their
    // trip to exist first — safe to run after trips, order between them
    // doesn't matter for correctness (though real-world chronological
    // order — pickup before sale — reads more naturally in logs)
    results.pickups = await Promise.all(
      (dto.pickups ?? []).map((item) =>
        this.safely(item.clientId, () =>
          this.pickupsService.create(item, workerId),
        ),
      ),
    );

    results.sales = await Promise.all(
      (dto.sales ?? []).map((item) =>
        this.safely(item.clientId, () =>
          this.salesService.create(item, workerId),
        ),
      ),
    );

    // Expenses only need their (optional) trip to exist
    results.expenses = await Promise.all(
      (dto.expenses ?? []).map((item) =>
        this.safely(item.clientId, () =>
          this.expensesService.create(item, workerId),
        ),
      ),
    );

    // Recounts must go LAST — they compute expected stock from
    // pickups/sales already in the DB, so they need those totals settled first
    results.recounts = await Promise.all(
      (dto.recounts ?? []).map((item) =>
        this.safely(item.clientId, () =>
          this.recountsService.create(item, workerId),
        ),
      ),
    );

    // The latest trip's ending last of all — end it only once everything
    // that happened during it has been recorded
    results.tripEndings.push(
      ...(await Promise.all(
        [...endingOf.values()].map((item) =>
          this.safely(item.tripId, () =>
            this.tripsService.endTrip(item.tripId, item, workerId),
          ),
        ),
      )),
    );

    return results;
  }

  /**
   * Runs one sync item in isolation — a failure here (bad data, ownership
   * violation, whatever) must NOT abort the rest of the batch. One bad
   * item shouldn't block 50 good ones from syncing.
   * Except when the database itself is failing: that's re-thrown so the
   * request fails (5xx) and the phone retries later, instead of marking
   * perfectly good records as bad.
   */
  private async safely(
    clientId: string,
    fn: () => Promise<{ id: string }>,
  ): Promise<SyncResult> {
    try {
      const record = await fn();
      return { clientId, status: 'ok', serverId: record.id };
    } catch (err) {
      if (isInfrastructureError(err)) throw err;
      this.logger.warn(
        `Sync item ${clientId} failed: ${(err as Error).message}`,
      );
      return { clientId, status: 'error', error: (err as Error).message };
    }
  }
}

function partition<T>(items: T[], test: (item: T) => boolean): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  for (const item of items) (test(item) ? yes : no).push(item);
  return [yes, no];
}

// Prisma codes for "the database isn't working" rather than "this record is bad":
// P1xxx connection/auth/timeout, P2024 pool timeout, P2028 transaction timeout,
// P2034 write conflict/deadlock, P2037 too many connections
const INFRA_CODES = new Set(['P2024', 'P2028', 'P2034', 'P2037']);
const NETWORK_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

function isInfrastructureError(err: unknown): boolean {
  if (
    err instanceof PrismaClientInitializationError ||
    err instanceof PrismaClientRustPanicError
  )
    return true;
  if (err instanceof PrismaClientKnownRequestError)
    return err.code.startsWith('P1') || INFRA_CODES.has(err.code);
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' && NETWORK_CODES.has(code);
}
