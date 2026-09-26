import { describe, expect, it } from "vitest";
import {
  askedLine,
  clashNote,
  decidedNote,
  nameClash,
  salesCount,
} from "./buyer-requests";

describe("buyer request text", () => {
  it("who asked and when, in Manila time", () => {
    expect(
      askedLine({
        id: "r1",
        name: "Nena",
        location: null,
        createdAtClient: "2026-09-25T17:00:00Z", // Sep 26, 1 AM in Manila
        requestedBy: { id: "w1", name: "Juan" },
        sales: 1,
      }),
    ).toBe("Asked by Juan · Sep 26");
  });
  it("sales count", () => {
    expect(salesCount(0)).toBe("No sales");
    expect(salesCount(1)).toBe("1 sale");
    expect(salesCount(3)).toBe("3 sales");
  });
  it("notes after a decision", () => {
    expect(decidedNote("approve", "Aling Nena")).toBe("Aling Nena added.");
    expect(decidedNote("merge", "Aling Nena")).toBe("Moved to Aling Nena.");
    expect(decidedNote("reject", "Nena")).toBe("Nena rejected.");
  });
});

describe("nameClash", () => {
  const buyers = [
    { name: "Aling Nena", archivedAt: null },
    { name: "Mang Ben", archivedAt: "2026-09-01T00:00:00Z" },
  ];
  it("finds a saved buyer with the same name, active first", () => {
    expect(nameClash(" aling  NENA", buyers)).toEqual({
      name: "Aling Nena",
      archived: false,
    });
    expect(nameClash("mang ben", buyers)).toEqual({
      name: "Mang Ben",
      archived: true,
    });
    expect(nameClash("Carlo", buyers)).toBeNull();
  });
  it("says what to do about it", () => {
    expect(clashNote({ name: "Aling Nena", archived: false })).toBe(
      "Aling Nena is already in the list — use Same as… instead.",
    );
    expect(clashNote({ name: "Mang Ben", archived: true })).toBe(
      "Mang Ben was removed — restore it below, then use Same as….",
    );
  });
});
