import { describe, expect, it } from "vitest";
import { syncAge, todayInManila } from "./sync-age";

const now = Date.parse("2026-09-26T04:00:00Z");
const ago = (min: number) => new Date(now - min * 60_000).toISOString();

describe("syncAge", () => {
  it("says how long ago the trip last synced; over an hour is stale", () => {
    expect(syncAge(null, now)).toEqual({ text: "not synced yet", stale: true });
    expect(syncAge(ago(0.5), now)).toEqual({
      text: "last synced just now",
      stale: false,
    });
    expect(syncAge(ago(12), now)).toEqual({
      text: "last synced 12 min ago",
      stale: false,
    });
    expect(syncAge(ago(61), now)).toEqual({
      text: "last synced 1 h ago",
      stale: true,
    });
  });
});

describe("todayInManila", () => {
  it("uses the Manila calendar day, not UTC", () => {
    expect(todayInManila(new Date("2026-09-25T17:00:00Z"))).toBe("2026-09-26");
  });
});
