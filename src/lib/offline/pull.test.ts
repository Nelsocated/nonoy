import { describe, expect, it } from "vitest";
import type { Api } from "@/lib/api";
import { testDb } from "./test-db"; // first: sets up fake IndexedDB
import { getPaymentQrs } from "./db";
import { createWriter } from "./writer";
import { pullInto } from "./pull";

const trip = (id: string, startedAt: string) => ({
  id,
  clientId: id,
  workerId: "w1",
  startedAt,
  endedAt: null,
  createdAtClient: startedAt,
  syncedAt: startedAt,
});

function fakeApi(over: Partial<Record<string, unknown>> = {}) {
  const trips = (over.trips as ReturnType<typeof trip>[]) ?? [];
  return {
    buyers: {
      // like the server: archived ones only when asked for
      list: async ({ archived = false } = {}) =>
        [
          {
            id: "b1",
            name: "Aling Nena",
            location: null,
            notes: null,
            createdAt: "",
            archivedAt: null,
          },
          {
            id: "b2",
            name: "Mang Ben",
            location: null,
            notes: null,
            createdAt: "",
            archivedAt: "2026-09-20T00:00:00Z",
          },
        ].filter((b) => archived || !b.archivedAt),
    },
    plantations: {
      list: async () => [
        { id: "p1", name: "Farm A", address: null, createdAt: "" },
      ],
    },
    trips: { mine: async () => trips },
    expenses: { mine: async () => [] },
    prices: { current: async () => null },
    paymentQrs: { list: async () => (over.qrs as unknown[]) ?? [] },
    buyerRequests: { mine: async () => (over.requests as unknown[]) ?? [] },
    reports: {
      trip: async (id: string) => ({
        ...trips.find((t) => t.id === id)!,
        pickups: [],
        recounts: [],
        expenses: [],
        sales: (over.sales as unknown[]) ?? [],
      }),
    },
  } as unknown as Pick<
    Api,
    | "buyers"
    | "plantations"
    | "trips"
    | "expenses"
    | "reports"
    | "prices"
    | "paymentQrs"
    | "buyerRequests"
  >;
}

describe("pullInto", () => {
  it("stores buyers, plantations and my trips as synced", async () => {
    const db = testDb();
    await pullInto(
      db,
      "w1",
      fakeApi({ trips: [trip("t1", "2026-09-25T01:00:00Z")] }),
    );
    // archived buyers too, so old sales and receipts keep their names offline
    expect(await db.buyers.count()).toBe(2);
    expect((await db.buyers.get("b2"))?.archivedAt).toBeTruthy();
    expect(await db.plantations.count()).toBe(1);
    expect(await db.trips.get("t1")).toMatchObject({
      userId: "w1",
      state: "synced",
    });
  });

  it("does not clobber pending records", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    const tripId = await w.startTrip();
    await w.endTrip(tripId); // local, not yet synced
    await pullInto(
      db,
      "w1",
      fakeApi({
        trips: [{ ...trip(tripId, "2026-09-25T01:00:00Z"), endedAt: null }],
      }),
    );
    const t = await db.trips.get(tripId);
    expect(t!.state).toBe("pending");
    expect(t!.endedAt).not.toBeNull();
  });

  it("marks sales the backend flagged as conflicts", async () => {
    const db = testDb();
    const sale = {
      id: "s1",
      clientId: "c1",
      tripId: "t1",
      buyerId: null,
      chickenCount: 1,
      totalKilo: "1.00",
      amount: "1.00",
      paymentMethod: "CASH",
      syncStatus: "CONFLICT",
      conflictReason: "Sold more than picked up",
      createdAtClient: "2026-09-25T01:00:00Z",
      syncedAt: "",
      buyer: null,
    };
    await pullInto(
      db,
      "w1",
      fakeApi({ trips: [trip("t1", "2026-09-25T01:00:00Z")], sales: [sale] }),
    );
    expect(await db.sales.get("c1")).toMatchObject({
      state: "conflict",
      error: "Sold more than picked up",
    });
  });

  it("keeps the price each sale was made at", async () => {
    const db = testDb();
    const sale = {
      id: "s1",
      clientId: "c1",
      tripId: "t1",
      buyerId: null,
      chickenCount: 1,
      totalKilo: "2.00",
      amount: "360.00",
      pricePerKilo: "180.00",
      listPricePerKilo: "190.00",
      paymentMethod: "CASH",
      syncStatus: "SYNCED",
      conflictReason: null,
      createdAtClient: "2026-09-25T01:00:00Z",
      syncedAt: "",
      buyer: null,
    };
    await pullInto(
      db,
      "w1",
      fakeApi({ trips: [trip("t1", "2026-09-25T01:00:00Z")], sales: [sale] }),
    );
    expect(await db.sales.get("c1")).toMatchObject({
      pricePerKilo: "180.00",
      listPricePerKilo: "190.00",
    });
  });

  it("fetches full details for the 5 most recent trips only", async () => {
    const db = testDb();
    const trips = Array.from({ length: 7 }, (_, i) =>
      trip(`t${i}`, `2026-09-2${i}T01:00:00Z`),
    ).reverse();
    const api = fakeApi({ trips });
    const seen: string[] = [];
    const orig = api.reports.trip;
    (api.reports as { trip: typeof orig }).trip = async (id) => (
      seen.push(id),
      orig(id)
    );
    await pullInto(db, "w1", api);
    expect(seen).toEqual(["t6", "t5", "t4", "t3", "t2"]);
  });
});

describe("pullInto — owner price", () => {
  it("keeps the owner's current price on the phone for offline sales", async () => {
    const db = testDb();
    const api = fakeApi();
    (api as unknown as { prices: unknown }).prices = {
      current: async () => ({
        id: "p1",
        pricePerKilo: "180.00",
        createdAt: "2026-09-25T06:00:00Z",
        setBy: { id: "o", name: "Owner" },
      }),
    };
    await pullInto(db, "w1", api);
    expect((await db.meta.get("price"))?.value).toMatchObject({
      pricePerKilo: "180.00",
      setAt: "2026-09-25T06:00:00Z",
      fetchedAt: expect.any(String),
    });
  });
  it("leaves the saved price alone when none is set on the server", async () => {
    const db = testDb();
    await db.meta.put({ key: "price", value: { pricePerKilo: "170.00" } });
    const api = fakeApi();
    (api as unknown as { prices: unknown }).prices = {
      current: async () => null,
    };
    await pullInto(db, "w1", api);
    expect((await db.meta.get("price"))?.value).toMatchObject({
      pricePerKilo: "170.00",
    });
  });
  it("still refreshes everything else when the price can't be fetched", async () => {
    const db = testDb();
    await db.meta.put({ key: "price", value: { pricePerKilo: "170.00" } });
    const api = fakeApi();
    (api as unknown as { prices: unknown }).prices = {
      current: async () => {
        throw new Error("prices down");
      },
    };
    await pullInto(db, "w1", api);
    expect(await db.buyers.count()).toBe(2);
    expect((await db.meta.get("price"))?.value).toMatchObject({
      pricePerKilo: "170.00",
    });
  });
});

describe("pullInto — payment QR codes", () => {
  const qr = (id: string, label: string) => ({
    id,
    label,
    payload: `pay-${id}`,
  });

  it("keeps the owner's QR codes on the phone, in the owner's order", async () => {
    const db = testDb();
    await pullInto(
      db,
      "w1",
      fakeApi({ qrs: [qr("z", "GCash"), qr("a", "Maya")] }),
    );
    expect((await getPaymentQrs(db)).map((q) => q.label)).toEqual([
      "GCash",
      "Maya",
    ]);
  });

  it("drops a code the owner removed", async () => {
    const db = testDb();
    await pullInto(
      db,
      "w1",
      fakeApi({ qrs: [qr("z", "GCash"), qr("a", "Maya")] }),
    );
    await pullInto(db, "w1", fakeApi({ qrs: [qr("a", "Maya")] }));
    expect((await getPaymentQrs(db)).map((q) => q.label)).toEqual(["Maya"]);
  });

  it("keeps the saved codes when the QR fetch fails", async () => {
    const db = testDb();
    await pullInto(db, "w1", fakeApi({ qrs: [qr("z", "GCash")] }));
    const api = fakeApi();
    (api as unknown as { paymentQrs: unknown }).paymentQrs = {
      list: async () => {
        throw new Error("offline");
      },
    };
    await pullInto(db, "w1", api);
    expect((await getPaymentQrs(db)).map((q) => q.label)).toEqual(["GCash"]);
  });

  it("stores my buyer requests and the sales' request ids", async () => {
    const db = testDb();
    await pullInto(
      db,
      "w1",
      fakeApi({
        trips: [trip("t1", "2026-09-25T01:00:00Z")],
        requests: [
          {
            id: "r1",
            name: "Nena",
            location: null,
            status: "APPROVED",
            buyerId: "b1",
            createdAtClient: "2026-09-25T02:00:00Z",
          },
        ],
        sales: [
          {
            id: "s1",
            clientId: "c1",
            tripId: "t1",
            buyerId: "b1",
            buyerRequestId: "r1",
            chickenCount: 1,
            totalKilo: "1.00",
            amount: "1.00",
            paymentMethod: "CASH",
            syncStatus: "SYNCED",
            conflictReason: null,
            createdAtClient: "2026-09-25T02:00:00Z",
          },
        ],
      }),
    );
    expect(await db.buyerRequests.get("r1")).toMatchObject({
      userId: "w1",
      status: "APPROVED",
      buyerId: "b1",
      state: "synced",
    });
    expect((await db.sales.get("c1"))!.buyerRequestId).toBe("r1");
  });

  it("a failed requests fetch keeps the saved ones", async () => {
    const db = testDb();
    await db.buyerRequests.put({
      clientId: "r1",
      userId: "w1",
      state: "synced",
      createdAtClient: "",
      name: "Nena",
      location: null,
      status: "PENDING",
      buyerId: null,
    });
    const api = fakeApi();
    (api.buyerRequests as { mine: () => Promise<unknown> }).mine = async () => {
      throw new Error("offline");
    };
    await pullInto(db, "w1", api);
    expect(await db.buyerRequests.count()).toBe(1);
  });

  it("drops a synced waiting request the server no longer sends", async () => {
    const db = testDb();
    const waiting = {
      userId: "w1",
      createdAtClient: "",
      name: "Nena",
      location: null,
      status: "PENDING" as const,
      buyerId: null,
    };
    // decided long ago (not sent), still sending, and failed to sync
    await db.buyerRequests.bulkPut([
      { ...waiting, clientId: "old", state: "synced" },
      { ...waiting, clientId: "queued", state: "synced" },
      { ...waiting, clientId: "failed", state: "error" },
    ]);
    await db.outbox.add({
      userId: "w1",
      kind: "buyerRequest",
      clientId: "queued",
      payload: {},
      createdAt: "",
    } as never);
    await pullInto(db, "w1", fakeApi());
    expect(
      (await db.buyerRequests.toArray()).map((r) => r.clientId).sort(),
    ).toEqual(["failed", "queued"]);
  });
});
