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
    expect(
      targetUrl("http://x:4000", ["reports", "daily"], "?from=2026-09-01"),
    ).toBe("http://x:4000/reports/daily?from=2026-09-01");
    expect(targetUrl("http://x:4000/", ["buyers", "a b"], "")).toBe(
      "http://x:4000/buyers/a%20b",
    );
  });
});

describe("backendHeaders", () => {
  it("forwards the browser IP (first X-Forwarded-For entry) with the shared secret", async () => {
    const { backendHeaders } = await import("./forward");
    const h = backendHeaders(
      new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
      "s3cret",
    );
    expect(h).toEqual({
      "X-Forwarded-For": "203.0.113.7",
      "X-Internal-Secret": "s3cret",
    });
  });
  it("falls back to X-Real-IP, and sends nothing without a secret", async () => {
    const { backendHeaders } = await import("./forward");
    expect(
      backendHeaders(new Headers({ "x-real-ip": "198.51.100.2" }), "s"),
    ).toEqual({ "X-Forwarded-For": "198.51.100.2", "X-Internal-Secret": "s" });
    expect(
      backendHeaders(new Headers({ "x-forwarded-for": "1.2.3.4" }), undefined),
    ).toEqual({});
  });
});
