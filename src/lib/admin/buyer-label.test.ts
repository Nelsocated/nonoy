import { describe, expect, it } from "vitest";
import { saleBuyerLabel } from "./buyer-label";

describe("saleBuyerLabel", () => {
  it("buyer, then waiting request, then walk-in", () => {
    expect(saleBuyerLabel({ buyer: { name: "Aling Nena" } })).toBe(
      "Aling Nena",
    );
    expect(
      saleBuyerLabel({
        buyer: null,
        buyerRequest: { name: "Nena", status: "PENDING" },
      }),
    ).toBe("Nena (waiting)");
    expect(
      saleBuyerLabel({
        buyer: null,
        buyerRequest: { name: "Nena", status: "REJECTED" },
      }),
    ).toBe("Walk-in");
    expect(saleBuyerLabel({ buyer: null })).toBe("Walk-in");
  });
});
