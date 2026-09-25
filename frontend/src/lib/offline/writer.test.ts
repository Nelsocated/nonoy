import { describe, expect, it, vi } from "vitest";
import { testDb } from "./test-db";
import { createWriter } from "./writer";

describe("writer", () => {
  it("startTrip saves the trip and its outbox item together", async () => {
    const db = testDb();
    const onWrite = vi.fn();
    const id = await createWriter(db, "w1", onWrite).startTrip();
    const trip = await db.trips.get(id);
    expect(trip).toMatchObject({ clientId: id, userId: "w1", state: "pending", endedAt: null });
    const [item] = await db.outbox.toArray();
    expect(item).toMatchObject({ userId: "w1", kind: "trip", clientId: id, status: "pending", attempts: 0 });
    expect(item.payload).toEqual({ clientId: id, startedAt: trip!.startedAt, createdAtClient: trip!.createdAtClient });
    expect(onWrite).toHaveBeenCalledOnce();
  });

  it("recordSale builds the exact /sync payload with its own activity-log id", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    const tripId = await w.startTrip();
    const id = await w.recordSale({ tripId, chickenCount: 3, totalKilo: "4.50", amount: "900.00", paymentMethod: "QR" });
    const item = (await db.outbox.toArray()).find((o) => o.kind === "sale")!;
    expect(item.payload).toMatchObject({ clientId: id, tripId, chickenCount: 3, totalKilo: "4.50", amount: "900.00", paymentMethod: "QR" });
    expect(item.payload.activityLogClientId).toEqual(expect.any(String));
    expect(item.payload.activityLogClientId).not.toBe(id);
    expect(await db.sales.get(id)).toMatchObject({ state: "pending", paymentMethod: "QR" });
  });

  it("endTrip marks the trip ended and queues an ending keyed by the trip id", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    const tripId = await w.startTrip();
    await w.endTrip(tripId);
    expect((await db.trips.get(tripId))!.endedAt).toEqual(expect.any(String));
    const ending = (await db.outbox.toArray()).find((o) => o.kind === "tripEnding")!;
    expect(ending.clientId).toBe(tripId);
    expect(ending.payload).toEqual({ tripId, endedAt: expect.any(String) });
  });

  it("recordPickup, recordRecount and recordExpense queue their kinds", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    const tripId = await w.startTrip();
    await w.recordPickup({ tripId, plantationId: "p1", chickenCount: 10, totalKilo: "20.00" });
    await w.recordRecount({ tripId, countedChicken: 7, countedKilo: "14.00" });
    await w.recordExpense({ description: "Gas", amount: "300.00" });
    expect((await db.outbox.toArray()).map((o) => o.kind).sort()).toEqual(["expense", "pickup", "recount", "trip"]);
  });

  it("keeps each worker's items separate", async () => {
    const db = testDb();
    await createWriter(db, "w1").startTrip();
    await createWriter(db, "w2").startTrip();
    expect(await db.outbox.where("userId").equals("w1").count()).toBe(1);
    expect(await db.trips.where("userId").equals("w2").count()).toBe(1);
  });
});
