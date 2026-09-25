import { describe, expect, it } from "vitest";
import type { Api } from "@/lib/api";
import { testDb } from "./test-db";
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
      list: async () => [
        {
          id: "b1",
          name: "Aling Nena",
          location: null,
          notes: null,
          createdAt: "",
        },
      ],
    },
    plantations: {
      list: async () => [
        { id: "p1", name: "Farm A", address: null, createdAt: "" },
      ],
    },
    trips: { mine: async () => trips },
    expenses: { mine: async () => [] },
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
    "buyers" | "plantations" | "trips" | "expenses" | "reports"
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
    expect(await db.buyers.count()).toBe(1);
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
