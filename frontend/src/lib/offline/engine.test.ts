import { describe, expect, it, vi } from "vitest";
import { ApiError, type SyncBatch, type SyncResults } from "@/lib/api";
import { testDb } from "./test-db";
import { createWriter } from "./writer";
import { BACKOFF_MS, createSyncEngine, toBatch } from "./engine";

const empty = (): SyncResults => ({
  trips: [],
  tripEndings: [],
  pickups: [],
  sales: [],
  recounts: [],
  expenses: [],
});
const allOk = (b: SyncBatch): SyncResults => ({
  ...empty(),
  trips: (b.trips ?? []).map((t) => ({
    clientId: t.clientId,
    status: "ok",
    serverId: t.clientId,
  })),
  tripEndings: (b.tripEndings ?? []).map((t) => ({
    clientId: t.tripId,
    status: "ok",
    serverId: t.tripId,
  })),
  sales: (b.sales ?? []).map((s) => ({
    clientId: s.clientId,
    status: "ok",
    serverId: "s-" + s.clientId,
  })),
});

describe("toBatch", () => {
  it("batches a trip, its sale and its ending together under the /sync keys", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    const tripId = await w.startTrip();
    await w.recordSale({
      tripId,
      chickenCount: 1,
      totalKilo: "1.00",
      amount: "100.00",
    });
    await w.endTrip(tripId);
    const b = toBatch(await db.outbox.toArray());
    expect(b.trips).toHaveLength(1);
    expect(b.sales).toHaveLength(1);
    expect(b.tripEndings).toEqual([{ tripId, endedAt: expect.any(String) }]);
  });
});

describe("syncOnce", () => {
  it("sends the queue, removes ok items and marks mirrors synced, then pulls", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    const tripId = await w.startTrip();
    const saleId = await w.recordSale({
      tripId,
      chickenCount: 1,
      totalKilo: "1.00",
      amount: "100.00",
    });
    const pull = vi.fn(async () => {});
    const out = await createSyncEngine({
      db,
      userId: "w1",
      push: async (b) => allOk(b),
      pull,
    }).syncOnce();
    expect(out).toEqual({ kind: "synced", pushed: 2, failed: 0 });
    expect(await db.outbox.count()).toBe(0);
    expect((await db.trips.get(tripId))!.state).toBe("synced");
    expect((await db.sales.get(saleId))!.state).toBe("synced");
    expect(pull).toHaveBeenCalledOnce();
  });

  it("keeps failed items with the backend's reason", async () => {
    const db = testDb();
    const tripId = await createWriter(db, "w1").startTrip();
    const push = async (): Promise<SyncResults> => ({
      ...empty(),
      trips: [
        {
          clientId: tripId,
          status: "error",
          error: "You already have an open trip",
        },
      ],
    });
    const out = await createSyncEngine({
      db,
      userId: "w1",
      push,
      pull: async () => {},
    }).syncOnce();
    expect(out).toEqual({ kind: "synced", pushed: 0, failed: 1 });
    const [item] = await db.outbox.toArray();
    expect(item).toMatchObject({
      status: "error",
      error: "You already have an open trip",
      attempts: 1,
    });
    expect(await db.trips.get(tripId)).toMatchObject({
      state: "error",
      error: "You already have an open trip",
    });
  });

  it("resends after a network error; results applied once (idempotent backend)", async () => {
    const db = testDb();
    await createWriter(db, "w1").startTrip();
    const push = vi
      .fn<(b: SyncBatch) => Promise<SyncResults>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockImplementation(async (b) => allOk(b));
    const engine = createSyncEngine({
      db,
      userId: "w1",
      push,
      pull: async () => {},
    });
    expect(await engine.syncOnce()).toEqual({
      kind: "offline",
      retryInMs: BACKOFF_MS[0],
    });
    expect(await db.outbox.count()).toBe(1);
    expect(await engine.syncOnce()).toEqual({
      kind: "synced",
      pushed: 1,
      failed: 0,
    });
    expect(await db.outbox.count()).toBe(0);
  });

  it("backs off further on each consecutive failure, capped at 5 minutes", async () => {
    const db = testDb();
    await createWriter(db, "w1").startTrip();
    const engine = createSyncEngine({
      db,
      userId: "w1",
      push: async () => {
        throw new ApiError(502, "down");
      },
      pull: async () => {},
    });
    const waits = [];
    for (let i = 0; i < 7; i++)
      waits.push(
        ((await engine.syncOnce()) as { retryInMs: number }).retryInMs,
      );
    expect(waits).toEqual([
      30_000, 60_000, 120_000, 240_000, 300_000, 300_000, 300_000,
    ]);
  });

  it("401 pauses and keeps the queue", async () => {
    const db = testDb();
    await createWriter(db, "w1").startTrip();
    const pull = vi.fn(async () => {});
    const out = await createSyncEngine({
      db,
      userId: "w1",
      push: async () => {
        throw new ApiError(401, "Unauthorized");
      },
      pull,
    }).syncOnce();
    expect(out).toEqual({ kind: "paused" });
    expect(await db.outbox.count()).toBe(1);
    expect(pull).not.toHaveBeenCalled();
  });

  it("only sends the signed-in user's items (per-user isolation)", async () => {
    const db = testDb();
    await createWriter(db, "w1").startTrip();
    await createWriter(db, "w2").startTrip();
    const push = vi.fn(async (b: SyncBatch) => allOk(b));
    await createSyncEngine({
      db,
      userId: "w1",
      push,
      pull: async () => {},
    }).syncOnce();
    expect(push.mock.calls[0][0].trips).toHaveLength(1);
    expect(await db.outbox.where("userId").equals("w2").count()).toBe(1);
  });

  it("with nothing queued it just pulls", async () => {
    const db = testDb();
    const push = vi.fn();
    const pull = vi.fn(async () => {});
    expect(
      await createSyncEngine({ db, userId: "w1", push, pull }).syncOnce(),
    ).toEqual({ kind: "synced", pushed: 0, failed: 0 });
    expect(push).not.toHaveBeenCalled();
    expect(pull).toHaveBeenCalledOnce();
  });
});
