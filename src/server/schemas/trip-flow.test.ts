import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  checkProblemSchema,
  problemsQuerySchema,
  tripsListQuerySchema,
} from "./reports";
import { createSaleSchema } from "./trip-flow";
import { syncBatchSchema } from "./sync";

const failing = (schema: z.ZodType, body: unknown) =>
  schema.safeParse(body).error?.issues.map((i) => String(i.path[0])) ?? [];
const ok = (schema: z.ZodType, body: unknown) => schema.safeParse(body).success;

const sale = {
  clientId: "11111111-1111-4111-8111-111111111111",
  activityLogClientId: "22222222-2222-4222-8222-222222222222",
  tripId: "33333333-3333-4333-8333-333333333333",
  chickenCount: 1,
  totalKilo: "2.00",
  amount: "360.00",
  createdAtClient: "2026-09-25T01:00:00Z",
};

describe("sale prices", () => {
  it("accepts both prices, or neither (older app versions)", () => {
    expect(
      failing(createSaleSchema, {
        ...sale,
        pricePerKilo: "180.00",
        listPricePerKilo: "190.00",
      }),
    ).toEqual([]);
    expect(
      failing(createSaleSchema, { ...sale, pricePerKilo: "180.00" }),
    ).toEqual([]);
    expect(failing(createSaleSchema, sale)).toEqual([]);
  });

  // the owner price alone means amount can't be checked against kilos × price
  it("rejects an owner price without the price charged", () => {
    expect(
      failing(createSaleSchema, { ...sale, listPricePerKilo: "190.00" }),
    ).toEqual(["pricePerKilo"]);
  });

  it("needs a whole, positive chicken count", () => {
    expect(ok(createSaleSchema, { ...sale, chickenCount: 0 })).toBe(false);
    expect(ok(createSaleSchema, { ...sale, chickenCount: 1.5 })).toBe(false);
  });

  it("payment method is optional, CASH or QR", () => {
    expect(ok(createSaleSchema, { ...sale, paymentMethod: "QR" })).toBe(true);
    expect(ok(createSaleSchema, { ...sale, paymentMethod: "GCASH" })).toBe(
      false,
    );
  });
});

describe("dashboard inputs", () => {
  it("trims the note and caps it at 200 characters", () => {
    expect(checkProblemSchema.parse({ note: "  counted twice " }).note).toBe(
      "counted twice",
    );
    expect(ok(checkProblemSchema, { note: "x".repeat(201) })).toBe(false);
  });

  it("page is a whole number from 1 to 10000", () => {
    expect(ok(problemsQuerySchema, { page: 2 })).toBe(true);
    expect(ok(problemsQuerySchema, { page: 0 })).toBe(false);
    expect(ok(problemsQuerySchema, { page: 10001 })).toBe(false);
  });

  it("trips list: month YYYY-MM from 2000, page 1-10000, workerId a UUID", () => {
    expect(ok(tripsListQuerySchema, { month: "2026-09" })).toBe(true);
    expect(
      ok(tripsListQuerySchema, {
        month: "2026-09",
        page: 2,
        workerId: "3f9a2c7e-1b2d-4c5e-8f90-123456789abc",
      }),
    ).toBe(true);
    for (const month of [undefined, "2026-13", "2026-00", "1999-12", "2026-9"])
      expect(ok(tripsListQuerySchema, { month })).toBe(false);
    expect(ok(tripsListQuerySchema, { month: "2026-09", page: 0 })).toBe(false);
    expect(ok(tripsListQuerySchema, { month: "2026-09", page: 10001 })).toBe(
      false,
    );
    expect(
      ok(tripsListQuerySchema, { month: "2026-09", workerId: "juan" }),
    ).toBe(false);
  });
});

describe("sync batch", () => {
  it("every list is optional", () => {
    expect(ok(syncBatchSchema, {})).toBe(true);
  });

  it("a trip ending names its trip", () => {
    expect(
      ok(syncBatchSchema, {
        tripEndings: [{ endedAt: "2026-09-25T09:00:00Z" }],
      }),
    ).toBe(false);
    expect(
      ok(syncBatchSchema, {
        tripEndings: [{ tripId: sale.tripId, endedAt: "2026-09-25T09:00:00Z" }],
      }),
    ).toBe(true);
  });

  it("checks every item, like ValidateNested did", () => {
    expect(
      ok(syncBatchSchema, { sales: [sale, { ...sale, clientId: "x" }] }),
    ).toBe(false);
  });
});
