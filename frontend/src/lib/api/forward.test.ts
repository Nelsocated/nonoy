import { describe, expect, it } from "vitest";
import { isForwardable, targetUrl } from "./forward";

describe("forward", () => {
  it("never exposes auth endpoints (they return tokens)", () => {
    expect(isForwardable(["auth", "login"])).toBe(false);
    expect(isForwardable(["auth", "refresh"])).toBe(false);
    expect(isForwardable(["AUTH", "login"])).toBe(false);
    expect(isForwardable(["trips", "me"])).toBe(true);
  });
  it("rejects path traversal segments", () => {
    expect(isForwardable(["..", "auth", "login"])).toBe(false);
    expect(isForwardable(["trips", "."])).toBe(false);
  });
  it("builds the backend URL with encoded segments and the query", () => {
    expect(targetUrl("http://x:4000", ["reports", "daily"], "?from=2026-09-01")).toBe("http://x:4000/reports/daily?from=2026-09-01");
    expect(targetUrl("http://x:4000/", ["buyers", "a b"], "")).toBe("http://x:4000/buyers/a%20b");
  });
});
