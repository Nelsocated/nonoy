import { describe, expect, it, vi } from "vitest";
import { testDb } from "./test-db";
import { createWriter } from "./writer";

describe("writer", () => {
  it("startTrip saves the trip and its outbox item together", async () => {
    const db = testDb();
    const onWrite = vi.fn();
    const id = await createWriter(db, "w1", onWrite).startTrip();
    const trip = await db.trips.get(id);
    expect(trip).toMatchObject({
      clientId: id,
      userId: "w1",
      state: "pending",
      endedAt: null,
    });
    const [item] = await db.outbox.toArray();
    expect(item).toMatchObject({
      userId: "w1",
      kind: "trip",
      clientId: id,
      status: "pending",
      attempts: 0,
    });
    expect(item.payload).toEqual({
      clientId: id,
      startedAt: trip!.startedAt,
      createdAtClient: trip!.createdAtClient,
    });
    expect(onWrite).toHaveBeenCalledOnce();
  });

  it("recordSale builds the exact /sync payload with its own activity-log id", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    const tripId = await w.startTrip();
    const id = await w.recordSale({
      tripId,
      chickenCount: 3,
      totalKilo: "4.50",
      pricePerKilo: "200.00",
      listPricePerKilo: "210.00",
      paymentMethod: "QR",
    });
    const item = (await db.outbox.toArray()).find((o) => o.kind === "sale")!;
    expect(item.payload).toMatchObject({
      clientId: id,
      tripId,
      chickenCount: 3,
      totalKilo: "4.50",
      amount: "900.00", // computed: 4.50 kg × ₱200.00
      pricePerKilo: "200.00",
      listPricePerKilo: "210.00",
      paymentMethod: "QR",
    });
    expect(item.payload.activityLogClientId).toEqual(expect.any(String));
    expect(item.payload.activityLogClientId).not.toBe(id);
    expect(await db.sales.get(id)).toMatchObject({
      state: "pending",
      paymentMethod: "QR",
    });
  });

  it("endTrip marks the trip ended and queues an ending keyed by the trip id", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    const tripId = await w.startTrip();
    await w.endTrip(tripId);
    expect((await db.trips.get(tripId))!.endedAt).toEqual(expect.any(String));
    const ending = (await db.outbox.toArray()).find(
      (o) => o.kind === "tripEnding",
    )!;
    expect(ending.clientId).toBe(tripId);
    expect(ending.payload).toEqual({ tripId, endedAt: expect.any(String) });
  });

  it("recordPickup, recordRecount and recordExpense queue their kinds", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    const tripId = await w.startTrip();
    await w.recordPickup({
      tripId,
      plantationId: "22222222-2222-4222-8222-222222222222",
      chickenCount: 10,
      totalKilo: "20.00",
    });
    await w.recordRecount({ tripId, countedChicken: 7, countedKilo: "14.00" });
    await w.recordExpense({ description: "Gas", amount: "300.00" });
    expect((await db.outbox.toArray()).map((o) => o.kind).sort()).toEqual([
      "expense",
      "pickup",
      "recount",
      "trip",
    ]);
  });

  it("keeps each worker's items separate", async () => {
    const db = testDb();
    await createWriter(db, "w1").startTrip();
    await createWriter(db, "w2").startTrip();
    expect(await db.outbox.where("userId").equals("w1").count()).toBe(1);
    expect(await db.trips.where("userId").equals("w2").count()).toBe(1);
  });
});

describe("writer validation (same rules as the backend DTOs)", () => {
  const trip = "11111111-1111-4111-8111-111111111111";
  it("rejects bad input and saves nothing", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    await expect(
      w.recordSale({
        tripId: trip,
        chickenCount: 0,
        totalKilo: "1.00",
        pricePerKilo: "10.00",
      }),
    ).rejects.toThrow(/chicken/i);
    await expect(
      w.recordSale({
        tripId: trip,
        chickenCount: 1,
        totalKilo: "1.234",
        pricePerKilo: "10.00",
      }),
    ).rejects.toThrow(/kilo/i);
    await expect(
      w.recordExpense({ description: "  ", amount: "5.00" }),
    ).rejects.toThrow(/description/i);
    await expect(
      w.recordExpense({ description: "x".repeat(201), amount: "5.00" }),
    ).rejects.toThrow(/description/i);
    await expect(
      w.recordPickup({
        tripId: "not-a-trip",
        plantationId: trip,
        chickenCount: 1,
        totalKilo: "1",
      }),
    ).rejects.toThrow(/trip/i);
    await expect(
      w.recordRecount({ tripId: trip, countedChicken: -1, countedKilo: "0" }),
    ).rejects.toThrow(/chicken/i);
    expect(await db.outbox.count()).toBe(0);
  });
  it("rejects a sale whose total is too big for the database", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    // each number fits Decimal(10, 2), but 99,999 kg × ₱1,001 doesn't
    await expect(
      w.recordSale({
        tripId: trip,
        chickenCount: 1,
        totalKilo: "99999.00",
        pricePerKilo: "1001.00",
      }),
    ).rejects.toThrow(/total is too large/i);
    expect(await db.outbox.count()).toBe(0);
    // the largest total that fits is still fine
    await w.recordSale({
      tripId: trip,
      chickenCount: 1,
      totalKilo: "99999.99",
      pricePerKilo: "1000.00",
    });
    expect(await db.outbox.count()).toBe(1);
  });
  it("accepts a zero recount and treats an empty buyer as none", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    await w.recordRecount({
      tripId: trip,
      countedChicken: 0,
      countedKilo: "0",
    });
    const id = await w.recordSale({
      tripId: trip,
      buyerId: "",
      chickenCount: 1,
      totalKilo: "1",
      pricePerKilo: "10",
    });
    const sale = (await db.outbox.toArray()).find((o) => o.clientId === id)!;
    expect(sale.payload).not.toHaveProperty("buyerId");
  });

  it("recordSale with a new buyer saves the request and the sale together", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    const tripId = await w.startTrip();
    const id = await w.recordSale({
      tripId,
      chickenCount: 2,
      totalKilo: "3.00",
      pricePerKilo: "180.00",
      newBuyer: { name: "  Nena ", location: " " },
    });
    const [req] = await db.buyerRequests.toArray();
    expect(req).toMatchObject({
      userId: "w1",
      name: "Nena",
      location: null,
      status: "PENDING",
      buyerId: null,
      state: "pending",
    });
    const sale = await db.sales.get(id);
    expect(sale!.buyerRequestId).toBe(req.clientId);
    const items = await db.outbox.orderBy("id").toArray();
    // the request is queued before its sale
    expect(items.map((i) => i.kind)).toEqual(["trip", "buyerRequest", "sale"]);
    expect(items[1].payload).toEqual({
      id: req.clientId,
      name: "Nena",
      location: null,
      createdAtClient: req.createdAtClient,
    });
    expect(items[2].payload).toMatchObject({ buyerRequestId: req.clientId });
    expect(items[2].payload).not.toHaveProperty("buyerId");
  });

  it("recordSale reuses a waiting request by id", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    const tripId = await w.startTrip();
    const rid = crypto.randomUUID();
    const id = await w.recordSale({
      tripId,
      chickenCount: 1,
      totalKilo: "1.00",
      pricePerKilo: "180.00",
      buyerRequestId: rid,
    });
    expect((await db.sales.get(id))!.buyerRequestId).toBe(rid);
    expect(await db.buyerRequests.count()).toBe(0);
  });

  it("recordSale refuses a blank or too long new buyer name", async () => {
    const db = testDb();
    const w = createWriter(db, "w1");
    const tripId = await w.startTrip();
    const base = {
      tripId,
      chickenCount: 1,
      totalKilo: "1.00",
      pricePerKilo: "180.00",
    };
    await expect(
      w.recordSale({ ...base, newBuyer: { name: " " } }),
    ).rejects.toThrow("Enter the buyer's name.");
    await expect(
      w.recordSale({ ...base, newBuyer: { name: "x".repeat(101) } }),
    ).rejects.toThrow("too long");
    expect(await db.sales.count()).toBe(0);
  });
});
