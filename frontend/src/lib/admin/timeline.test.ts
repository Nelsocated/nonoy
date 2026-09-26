import { describe, expect, it } from "vitest";
import type { TripDetail } from "@/lib/api/types";
import { stamp, tripTimeline } from "./timeline";

const at = (h: number) => `2026-09-26T0${h}:00:00.000Z`;
const worker = { id: "w1", name: "Juan" };
const trip = {
  worker,
  pickups: [{ id: "p1", createdAtClient: at(1) }],
  sales: [
    {
      id: "s1",
      createdAtClient: at(3),
      syncStatus: "SYNCED",
      pricePerKilo: "175.00",
      listPricePerKilo: "180",
      checkedAt: null,
    },
    {
      id: "s2",
      createdAtClient: at(4),
      syncStatus: "SYNCED",
      pricePerKilo: "180.00",
      listPricePerKilo: "180",
      checkedAt: null,
    },
  ],
  recounts: [
    {
      id: "r1",
      createdAtClient: at(2),
      discrepancyFlagged: true,
      countedChicken: 7,
      expectedChicken: 10,
      countedKilo: "15.50",
      expectedKilo: "20.00",
      checkedAt: null,
    },
  ],
  expenses: [{ id: "e1", createdAtClient: at(5) }],
} as unknown as TripDetail;

describe("tripTimeline", () => {
  it("merges every record by time", () => {
    expect(tripTimeline(trip).map((e) => e.key)).toEqual([
      "pickup:p1",
      "recount:r1",
      "sale:s1",
      "sale:s2",
      "expense:e1",
    ]);
  });
  it("marks problems: a mismatched recount and a changed price (by value, not text)", () => {
    const t = tripTimeline(trip);
    expect(t[1].problem).toMatchObject({
      kind: "recount",
      worker,
      chickenDifference: -3,
      kiloDifference: "-4.50",
    });
    expect(t[2].problem).toMatchObject({ kind: "sale", worker });
    expect(t[3].problem).toBeNull(); // "180.00" vs "180" is the same price
  });
});

describe("stamp", () => {
  const tz = "Asia/Manila";
  it("shows only the time on the same day", () => {
    // 11:30 PM and 6:10 AM the same Manila day
    const s = stamp("2026-09-26T15:30:00Z", "2026-09-25T22:10:00Z", tz);
    expect(s).toMatch(/11:30/);
    expect(s).not.toMatch(/Sep/);
  });
  it("adds the date after midnight", () => {
    const s = stamp("2026-09-26T16:30:00Z", "2026-09-26T15:30:00Z", tz);
    expect(s).toMatch(/Sep 27/);
    expect(s).toMatch(/12:30/);
  });
});
