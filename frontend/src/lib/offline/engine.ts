import {
  ApiError,
  type SyncBatch,
  type SyncResult,
  type SyncResults,
} from "@/lib/api";
import {
  type OfflineDb,
  type OutboxItem,
  type OutboxKind,
  mirrorTable,
} from "./db";

export const BACKOFF_MS = [30_000, 60_000, 120_000, 240_000, 300_000];

export type SyncOutcome =
  | { kind: "synced"; pushed: number; failed: number }
  | { kind: "offline"; retryInMs: number }
  | { kind: "paused" };

const KEY: Record<OutboxKind, keyof SyncResults> = {
  trip: "trips",
  tripEnding: "tripEndings",
  pickup: "pickups",
  sale: "sales",
  recount: "recounts",
  expense: "expenses",
};

export function toBatch(items: OutboxItem[]): SyncBatch {
  const batch: Record<string, unknown[]> = {};
  for (const item of items) (batch[KEY[item.kind]] ??= []).push(item.payload);
  return batch as SyncBatch;
}

type Deps = {
  db: OfflineDb;
  userId: string;
  push: (batch: SyncBatch) => Promise<SyncResults>;
  pull: () => Promise<void>;
};

// One pass: send the queue, apply per-item results, then refresh local data.
// Network errors, 5xx, 429 and 502 leave the queue untouched (the backend is
// idempotent on clientId, so resending is safe).
export function createSyncEngine({ db, userId, push, pull }: Deps) {
  let failures = 0;

  async function apply(items: OutboxItem[], results: SyncResults) {
    let pushed = 0;
    let failed = 0;
    await db.transaction(
      "rw",
      [db.outbox, db.trips, db.pickups, db.sales, db.recounts, db.expenses],
      async () => {
        for (const item of items) {
          const result: SyncResult | undefined = results[KEY[item.kind]]?.find(
            (r) => r.clientId === item.clientId,
          );
          if (!result) continue;
          const table = mirrorTable(db, item.kind);
          if (result.status === "ok") {
            pushed++;
            await db.outbox.delete(item.id!);
            await table.update(item.clientId, {
              state: "synced",
              error: undefined,
            });
          } else {
            failed++;
            await db.outbox.update(item.id!, {
              status: "error",
              error: result.error,
              attempts: item.attempts + 1,
            });
            await table.update(item.clientId, {
              state: "error",
              error: result.error,
            });
          }
        }
      },
    );
    return { pushed, failed };
  }

  async function syncOnce(): Promise<SyncOutcome> {
    const items = await db.outbox.where("userId").equals(userId).sortBy("id");
    let counts = { pushed: 0, failed: 0 };
    if (items.length) {
      try {
        counts = await apply(items, await push(toBatch(items)));
      } catch (e) {
        if (e instanceof ApiError && e.status === 401)
          return { kind: "paused" };
        const retryInMs = BACKOFF_MS[Math.min(failures, BACKOFF_MS.length - 1)];
        failures++;
        return { kind: "offline", retryInMs };
      }
    }
    failures = 0;
    try {
      await pull();
    } catch {
      // stale local data is fine; the next pass pulls again
    }
    return { kind: "synced", ...counts };
  }

  return { syncOnce };
}
