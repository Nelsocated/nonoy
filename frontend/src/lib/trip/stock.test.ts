import { describe, expect, it } from "vitest";
import { overSell, recountResult, stockOnTruck } from "./stock";

describe("stockOnTruck", () => {
  it("is everything picked up minus everything sold, whatever the sync state", () => {
    const pickups = [
      { chickenCount: 30, totalKilo: "60.50" },
      { chickenCount: 20, totalKilo: "40.00" },
    ];
    const sales = [
      { chickenCount: 5, totalKilo: "10.25" },
      { chickenCount: 3, totalKilo: "6.10" },
    ];
    expect(stockOnTruck(pickups, sales)).toEqual({
      chicken: 42,
      kilo: "84.15",
    });
  });
});

describe("overSell", () => {
  const stock = { chicken: 2, kilo: "4.00" };
  it("warns when a sale is more than what's on the truck", () => {
    expect(overSell(stock, 3, "4.00")).toMatch(/more chickens/);
    expect(overSell(stock, 2, "4.50")).toMatch(/more kilos/);
    expect(overSell(stock, 3, "4.50")).toMatch(/more chickens and kilos/);
  });
  it("never shows what's on the truck (the recount is blind)", () => {
    expect(overSell(stock, 3, "4.50")).not.toMatch(/\d/);
  });
  it("shows the numbers to owners/admins, who may see the stock", () => {
    expect(overSell(stock, 3, "4.50", { showStock: true })).toBe(
      "Only 2 chickens / 4.00 kg left on the truck.",
    );
  });
  it("says nothing when it fits", () => {
    expect(overSell(stock, 2, "4.00")).toBeNull();
  });
});

describe("recountResult", () => {
  it("reports the difference as counted minus expected", () => {
    expect(
      recountResult(
        { chicken: 10, kilo: "20.00" },
        { chicken: 8, kilo: "16.90" },
      ),
    ).toEqual({
      matches: false,
      chickenDiff: -2,
      kiloDiff: "-3.10",
    });
    expect(
      recountResult(
        { chicken: 10, kilo: "20.00" },
        { chicken: 10, kilo: "20" },
      ),
    ).toEqual({
      matches: true,
      chickenDiff: 0,
      kiloDiff: "0.00",
    });
  });
});
