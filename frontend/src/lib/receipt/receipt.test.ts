import { describe, expect, it } from "vitest";
import type { LocalSale } from "@/lib/offline/db";
import {
  receiptCode,
  receiptDate,
  receiptFromLocalSale,
  receiptFromServer,
  salesOfDay,
} from "./receipt";

const sale = (over: Partial<LocalSale> = {}): LocalSale => ({
  clientId: "3f9a2c7e-1b2d-4c5e-8f90-123456789abc",
  userId: "u1",
  state: "pending",
  createdAtClient: "2026-09-26T06:41:00.000Z",
  tripId: "t1",
  buyerId: "b1",
  chickenCount: 12,
  totalKilo: "10.5",
  amount: "1890.00",
  paymentMethod: "CASH",
  pricePerKilo: "180",
  listPricePerKilo: "175.00",
  ...over,
});
const buyers = new Map([["b1", "Aling Nena"]]);
const names = { buyers, requests: new Map() };

describe("receiptCode", () => {
  it("is MF- plus the first 8 characters of the sale id, in capitals", () => {
    expect(receiptCode("3f9a2c7e-1b2d-4c5e-8f90-123456789abc")).toBe(
      "MF-3F9A2C7E",
    );
  });
});

describe("receiptFromLocalSale", () => {
  it("a waiting new buyer shows as waiting", () => {
    expect(
      receiptFromLocalSale(
        sale({ buyerId: null, buyerRequestId: "r1" }),
        {
          buyers,
          requests: new Map([
            ["r1", { name: "Nena", status: "PENDING" as const, buyerId: null }],
          ]),
        },
        "Juan",
      ).buyerName,
    ).toBe("Nena (waiting)");
  });
  it("builds the receipt with padded kilos and prices", () => {
    expect(receiptFromLocalSale(sale(), names, "Juan")).toEqual({
      code: "MF-3F9A2C7E",
      issuedAt: "2026-09-26T06:41:00.000Z",
      workerName: "Juan",
      buyerName: "Aling Nena",
      chickenCount: 12,
      totalKilo: "10.50",
      pricePerKilo: "180.00",
      amount: "1890.00",
      paymentMethod: "CASH",
    });
  });

  it("whole kilos get 2 decimals", () => {
    expect(
      receiptFromLocalSale(sale({ totalKilo: "7" }), names, "Juan").totalKilo,
    ).toBe("7.00");
  });

  it("no buyer → Walk-in", () => {
    expect(
      receiptFromLocalSale(sale({ buyerId: null }), names, "Juan").buyerName,
    ).toBe("Walk-in");
    expect(
      receiptFromLocalSale(sale({ buyerId: undefined }), names, "Juan")
        .buyerName,
    ).toBe("Walk-in");
  });

  it("buyer no longer on the phone (archived) → Buyer", () => {
    expect(
      receiptFromLocalSale(sale({ buyerId: "gone" }), names, "Juan").buyerName,
    ).toBe("Buyer");
  });

  it("sale from before prices existed → no price", () => {
    expect(
      receiptFromLocalSale(sale({ pricePerKilo: null }), names, "Juan")
        .pricePerKilo,
    ).toBeNull();
  });
});

describe("receiptFromServer", () => {
  const base = {
    clientId: "3f9a2c7e-1b2d-4c5e-8f90-123456789abc",
    tripId: "t1",
    createdAtClient: "2026-09-26T06:41:00.000Z",
    workerName: "Juan",
    buyerName: "Aling Nena",
    chickenCount: 12,
    totalKilo: "10.50",
    pricePerKilo: "180.00",
    amount: "1890.00",
    paymentMethod: "QR" as const,
  };

  it("maps the endpoint's answer to the receipt", () => {
    expect(receiptFromServer(base)).toEqual({
      code: "MF-3F9A2C7E",
      issuedAt: "2026-09-26T06:41:00.000Z",
      workerName: "Juan",
      buyerName: "Aling Nena",
      chickenCount: 12,
      totalKilo: "10.50",
      pricePerKilo: "180.00",
      amount: "1890.00",
      paymentMethod: "QR",
    });
  });

  it("null buyer → Walk-in; null price stays null", () => {
    const r = receiptFromServer({
      ...base,
      buyerName: null,
      pricePerKilo: null,
    });
    expect(r.buyerName).toBe("Walk-in");
    expect(r.pricePerKilo).toBeNull();
  });
});

describe("salesOfDay", () => {
  it("keeps only that day's sales, newest first", () => {
    const at = (h: number, d = 26) => new Date(2026, 8, d, h, 0).toISOString();
    const rows = [
      sale({ clientId: "a", createdAtClient: at(9) }),
      sale({ clientId: "b", createdAtClient: at(15) }),
      sale({ clientId: "c", createdAtClient: at(12, 25) }),
    ];
    expect(
      salesOfDay(rows, new Date(2026, 8, 26, 18)).map((s) => s.clientId),
    ).toEqual(["b", "a"]);
  });
});

describe("receiptDate", () => {
  it("prints Manila time with a dot between date and time", () => {
    // 06:41 UTC = 2:41 PM in Manila, whatever zone the viewer is in
    expect(receiptDate("2026-09-26T06:41:00.000Z")).toBe(
      "Sep 26, 2026 · 2:41 PM",
    );
    // just after midnight Manila is still the previous day in UTC
    expect(receiptDate("2026-09-26T16:05:00.000Z")).toMatch(/^Sep 27, 2026 · /);
  });
});
