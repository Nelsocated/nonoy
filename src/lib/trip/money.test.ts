import { describe, expect, it } from "vitest";
import { fromCenti, saleAmount, toCenti, twoDp } from "./money";

describe("centavo math", () => {
  it("pads API decimals to 2 places", () => {
    expect(twoDp("12.5")).toBe("12.50");
    expect(twoDp("7")).toBe("7.00");
    expect(twoDp("-0.3")).toBe("-0.30");
  });

  it("converts 2-dp strings exactly", () => {
    expect(toCenti("180")).toBe(18000);
    expect(toCenti("60.5")).toBe(6050);
    expect(toCenti("0.07")).toBe(7);
    expect(fromCenti(8415)).toBe("84.15");
    expect(fromCenti(-310)).toBe("-3.10");
  });
});

describe("saleAmount (must match the backend: half-up to the centavo)", () => {
  it.each([
    ["2.50", "180.00", "450.00"],
    ["1.25", "180.10", "225.13"], // 225.125 → 225.13
    ["0.33", "99.99", "33.00"], // 32.9967 → 33.00
    ["10", "175", "1750.00"],
  ])("%s kg × ₱%s = ₱%s", (kilo, price, amount) => {
    expect(saleAmount(kilo, price)).toBe(amount);
  });
});
