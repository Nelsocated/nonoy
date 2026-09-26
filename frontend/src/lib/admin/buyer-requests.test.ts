import { describe, expect, it } from "vitest";
import { askedLine, decidedNote, salesCount } from "./buyer-requests";

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
