import { describe, expect, it } from "vitest";
import type { Problem } from "@/lib/api/types";
import { problemSentence } from "./problems";

const recount = (chickenDifference: number, kiloDifference: string) =>
  ({ kind: "recount", chickenDifference, kiloDifference }) as Problem;
const sale = (over: object) =>
  ({
    kind: "sale",
    syncStatus: "SYNCED",
    conflictReason: null,
    pricePerKilo: "175",
    listPricePerKilo: "180",
    amount: "875.00",
    buyer: null,
    ...over,
  }) as Problem;

describe("problemSentence", () => {
  it("says whether a recount was short or over, and by how much", () => {
    expect(problemSentence(recount(-3, "-4.50"))).toBe(
      "Recount short 3 chickens / 4.50 kg",
    );
    expect(problemSentence(recount(2, "1.00"))).toBe(
      "Recount over 2 chickens / 1.00 kg",
    );
    expect(problemSentence(recount(0, "-0.50"))).toBe("Recount short 0.50 kg");
    expect(problemSentence(recount(-1, "0.00"))).toBe(
      "Recount short 1 chicken",
    );
  });
  it("says each direction when chickens and kilos disagree", () => {
    expect(problemSentence(recount(2, "-0.50"))).toBe(
      "Recount over 2 chickens, short 0.50 kg",
    );
    expect(problemSentence(recount(-1, "3.00"))).toBe(
      "Recount short 1 chicken, over 3.00 kg",
    );
  });
  it("names the conflict first, even when the price also changed", () => {
    expect(
      problemSentence(
        sale({
          syncStatus: "CONFLICT",
          conflictReason: "Sale was recorded after its trip had ended",
          buyer: { id: "b1", name: "Aling Nena" },
        }),
      ),
    ).toBe("Sale after trip ended · Aling Nena · ₱875.00");
  });
  it("shows the price the worker used against the owner's", () => {
    expect(problemSentence(sale({}))).toBe(
      "Price changed ₱175.00 (owner ₱180.00) · Walk-in",
    );
    expect(
      problemSentence(sale({ buyer: { id: "b1", name: "Aling Nena" } })),
    ).toBe("Price changed ₱175.00 (owner ₱180.00) · Aling Nena");
  });
});
