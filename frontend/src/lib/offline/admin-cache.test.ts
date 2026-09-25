import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { adminStorage, asOf, clearAdminCache } from "./admin-cache";

describe("admin cache", () => {
  it("clearAdminCache wipes everything stored", async () => {
    await adminStorage.setItem("q", "cached");
    await clearAdminCache();
    expect(await adminStorage.getItem("q")).toBeUndefined();
  });
  it("asOf formats the time the data was fetched", () => {
    const t = new Date("2026-09-25T07:42:00Z").getTime();
    expect(asOf(t, t + 60_000)).toMatch(/as of .*\d{1,2}:42/i);
  });
});
