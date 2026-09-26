import { describe, expect, it } from "vitest";
import { isAppNavigation, pageCacheKey } from "./sw-routes";

const nav = (path: string, { mode = "navigate", sameOrigin = true } = {}) => ({
  request: { mode } as Request,
  url: new URL(path, "https://app.example"),
  sameOrigin,
});

describe("isAppNavigation", () => {
  it("matches page loads of the app (kept 30 days for offline use)", () => {
    expect(isAppNavigation(nav("/field"))).toBe(true);
    expect(isAppNavigation(nav("/field/sync"))).toBe(true);
    expect(isAppNavigation(nav("/admin"))).toBe(true);
  });
  it("skips API calls, non-navigation fetches and other sites", () => {
    expect(isAppNavigation(nav("/api/trips/me"))).toBe(false);
    expect(isAppNavigation(nav("/field", { mode: "cors" }))).toBe(false);
    expect(isAppNavigation(nav("/field", { sameOrigin: false }))).toBe(false);
  });
});

// One cache entry (and one expiry record) per page, whatever its ?id= — so a
// receipt for a sale saved offline opens, and old copies can't pile up.
describe("pageCacheKey", () => {
  it("drops the query string", () => {
    const req = new Request(
      "https://app.example/field/sale/receipt?id=abc&saved=1",
    );
    expect(pageCacheKey(req)).toBe("https://app.example/field/sale/receipt");
  });
  it("leaves plain pages alone", () => {
    expect(pageCacheKey(new Request("https://app.example/field"))).toBe(
      "https://app.example/field",
    );
  });
});
