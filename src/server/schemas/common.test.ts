import { describe, expect, it } from "vitest";
import { decimalAmount } from "./common";

const ok = (v: string) => decimalAmount("v").safeParse(v).success;

describe("decimalAmount", () => {
  it.each(["0", "300", "140.25", "0.5", "99999999.99"])("accepts %s", (v) => {
    expect(ok(v)).toBe(true);
  });
  it.each(["-500", "1e5", "1.234", "", "abc", ".5", "5.", "123456789"])(
    "rejects %s",
    (v) => {
      expect(ok(v)).toBe(false);
    },
  );
  it("keeps the old message", () => {
    const r = decimalAmount("pricePerKilo").safeParse("-1");
    expect(r.error?.issues[0].message).toBe(
      "pricePerKilo must be a non-negative number with up to 2 decimals",
    );
  });
});
