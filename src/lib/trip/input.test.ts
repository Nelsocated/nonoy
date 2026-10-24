import { describe, expect, it } from "vitest";
import { decimal, digits, round2 } from "./input";

describe("typing filters", () => {
  it("digits keeps whole numbers only", () => {
    expect(digits("1a2.5")).toBe("125");
    expect(digits("12345678")).toBe("123456");
  });
  it("decimal keeps one dot and lets extra decimals through (rounded later)", () => {
    expect(decimal("12.345")).toBe("12.345");
    expect(decimal("1.2.3")).toBe("1.23");
    expect(decimal("₱180")).toBe("180");
    expect(decimal("0.")).toBe("0.");
    expect(decimal("1.123456789")).toBe("1.123456");
  });
});

describe("round2 (more than 2 decimals → normal rounding, half-up)", () => {
  it.each([
    ["10.255", "10.26"],
    ["10.254", "10.25"],
    ["180.555", "180.56"],
    ["0.005", "0.01"],
    ["99.999", "100.00"],
    ["1.123456", "1.12"],
  ])("%s → %s", (input, out) => expect(round2(input)).toBe(out));

  it("leaves values with 2 or fewer decimals alone", () => {
    expect(round2("12")).toBe("12");
    expect(round2("12.3")).toBe("12.3");
    expect(round2("12.34")).toBe("12.34");
  });
  it("tidies a trailing dot and ignores empty input", () => {
    expect(round2("1.")).toBe("1");
    expect(round2("")).toBe("");
  });
});

describe("typedAmount (what number fields store as you type)", () => {
  it("rounds as soon as a third decimal is typed, and leaves partial input alone", async () => {
    const { typedAmount } = await import("./input");
    expect(typedAmount("10.255")).toBe("10.26");
    expect(typedAmount("10.")).toBe("10.");
    expect(typedAmount("10.2")).toBe("10.2");
    expect(typedAmount("₱180.555")).toBe("180.56");
  });
});
