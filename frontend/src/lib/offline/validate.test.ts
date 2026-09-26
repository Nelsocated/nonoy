import { describe, expect, it } from "vitest";
import { buyerName, place, problem } from "./validate";

describe("problem", () => {
  it("returns the rule's message, or undefined when it passes", () => {
    expect(problem(() => buyerName("  "))).toBe("Enter the buyer's name.");
    expect(problem(() => place("x".repeat(101)))).toMatch("too long");
    expect(problem(() => buyerName("Aling Nena"))).toBeUndefined();
  });

  it("lets other errors through", () => {
    expect(() =>
      problem(() => {
        throw new TypeError("boom");
      }),
    ).toThrow("boom");
  });
});
