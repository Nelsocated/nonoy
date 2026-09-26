import { describe, expect, it } from "vitest";
import { tripTimes } from "./trips";

describe("tripTimes", () => {
  const tz = "Asia/Manila";
  it("date, start and end on the same day", () => {
    const s = tripTimes("2026-09-01T22:10:00Z", "2026-09-02T08:30:00Z", tz);
    expect(s).toMatch(/^Wed, Sep 2 · 6:10\sAM → 4:30\sPM$/);
  });
  it("says Still out while the trip is open", () => {
    expect(tripTimes("2026-09-01T22:10:00Z", null, tz)).toMatch(
      / → Still out$/,
    );
  });
  it("adds the end date when it ends on another day", () => {
    expect(
      tripTimes("2026-09-01T22:10:00Z", "2026-09-02T17:00:00Z", tz),
    ).toMatch(/→ Sep 3, 1:00\sAM$/);
  });
});
