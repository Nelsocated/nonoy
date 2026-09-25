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

// items per /sync request (keeps well under the backend's JSON body limit)
const CHUNK = 50;
// failed items are retried automatically this many times, then only on "Sync now"
export const AUTO_RETRY_LIMIT = 3;

type Counts = { pushed: number; failed: number };

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

  // the server will never accept this exact batch (validation, too large…)
  const rejected = (e: unknown): e is ApiError =>
    e instanceof ApiError &&
    e.status >= 400 &&
    e.status < 500 &&
    ![401, 408, 429].includes(e.status);

  async function markRejected(item: OutboxItem, error: string) {
    const table = mirrorTable(db, item.kind);
    await db.transaction("rw", db.outbox, table, async () => {
      await db.outbox.update(item.id!, {
        status: "error",
        error,
        attempts: item.attempts + 1,
      });
      await table.update(item.clientId, { state: "error", error });
    });
  }

  // Send items; if the server rejects the whole request, split it in halves
  // (oldest first, so trips still go before their sales) until the bad item
  // is found — it gets marked, everything else still syncs.
  async function send(items: OutboxItem[]): Promise<Counts> {
    try {
      return await apply(items, await push(toBatch(items)));
    } catch (e) {
      if (!rejected(e)) throw e;
      if (items.length === 1) {
        await markRejected(items[0], e.message);
        return { pushed: 0, failed: 1 };
      }
      const mid = Math.ceil(items.length / 2);
      const a = await send(items.slice(0, mid));
      const b = await send(items.slice(mid));
      return { pushed: a.pushed + b.pushed, failed: a.failed + b.failed };
    }
  }

  // manual = the worker tapped "Sync now": also retry items that already
  // failed AUTO_RETRY_LIMIT times (automatic passes leave those alone)
  async function syncOnce({ manual = false } = {}): Promise<SyncOutcome> {
    const all = await db.outbox.where("userId").equals(userId).sortBy("id");
    const items = manual
      ? all
      : all.filter(
          (i) => i.status !== "error" || i.attempts < AUTO_RETRY_LIMIT,
        );
    const counts: Counts = { pushed: 0, failed: 0 };
    try {
      for (let i = 0; i < items.length; i += CHUNK) {
        const r = await send(items.slice(i, i + CHUNK));
        counts.pushed += r.pushed;
        counts.failed += r.failed;
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return { kind: "paused" };
      const retryInMs = BACKOFF_MS[Math.min(failures, BACKOFF_MS.length - 1)];
      failures++;
      return { kind: "offline", retryInMs };
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
