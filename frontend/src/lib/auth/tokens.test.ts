import { describe, expect, it } from "vitest";
import { isExpiring, tokenExpiry } from "./tokens";

const jwt = (payload: object) => `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

describe("tokens", () => {
  it("reads exp in ms", () => {
    expect(tokenExpiry(jwt({ exp: 1000 }))).toBe(1_000_000);
  });
  it("returns null for garbage", () => {
    expect(tokenExpiry("not-a-jwt")).toBeNull();
    expect(tokenExpiry(jwt({ sub: "x" }))).toBeNull();
  });
  it("treats missing, garbage and near-expiry tokens as expiring", () => {
    const now = 1_000_000;
    expect(isExpiring(undefined, now)).toBe(true);
    expect(isExpiring("garbage", now)).toBe(true);
    expect(isExpiring(jwt({ exp: now / 1000 + 10 }), now)).toBe(true); // 10s left < 30s skew
    expect(isExpiring(jwt({ exp: now / 1000 + 300 }), now)).toBe(false);
  });
});
