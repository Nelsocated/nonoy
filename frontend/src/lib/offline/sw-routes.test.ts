import { describe, expect, it } from "vitest";
import { isAppNavigation, PAGES_MATCH_OPTIONS } from "./sw-routes";

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

describe("PAGES_MATCH_OPTIONS", () => {
  it("serves a cached page for any ?id= (receipts open offline the first time)", () => {
    expect(PAGES_MATCH_OPTIONS).toEqual({ ignoreSearch: true });
  });
});
