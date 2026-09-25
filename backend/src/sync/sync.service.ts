import { Injectable, Logger } from '@nestjs/common';
import { TripsService } from '../trips/trips.service.js';
import { PickupsService } from '../pickups/pickups.service.js';
import { SalesService } from '../sales/sales.service.js';
import { RecountsService } from '../recounts/recounts.service.js';
import { ExpensesService } from '../expenses/expenses.service.js';
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
  ) {}

  async processBatch(dto: SyncBatchDto, workerId: string) {
    const results = {
      trips: [] as SyncResult[],
      tripEndings: [] as SyncResult[],
      pickups: [] as SyncResult[],
      sales: [] as SyncResult[],
      recounts: [] as SyncResult[],
      expenses: [] as SyncResult[],
    };

    // Endings for trips created in an EARLIER batch go before new trips: a
    // worker who ended yesterday's trip and started today's while offline
    // would otherwise hit "one open trip per worker" on the new one.
    // (Records can still attach to an ended trip, so this order is safe.)
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
    // race the "one open trip per worker" check
    for (const item of dto.trips ?? []) {
      results.trips.push(
        await this.safely(item.clientId, () =>
          this.tripsService.create(item, workerId),
        ),
      );
    }

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

    // Trip endings last of all — end the trip only once everything that
    // happened during it has been recorded
    results.tripEndings.push(
      ...(await Promise.all(
        sameBatchEndings.map((item) =>
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
   */
  private async safely(
    clientId: string,
    fn: () => Promise<{ id: string }>,
  ): Promise<SyncResult> {
    try {
      const record = await fn();
      return { clientId, status: 'ok', serverId: record.id };
    } catch (err) {
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
