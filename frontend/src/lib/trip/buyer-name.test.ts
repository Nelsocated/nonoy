import { describe, expect, it } from "vitest";
import { sameName, saleBuyerName, type BuyerNames } from "./buyer-name";

const names: BuyerNames = {
  buyers: new Map([["b1", "Aling Nena"]]),
  requests: new Map([
    ["r1", { name: "Nena", status: "PENDING", buyerId: null }],
    ["r2", { name: "Nena", status: "MERGED", buyerId: "b1" }],
    ["r3", { name: "Ben", status: "REJECTED", buyerId: null }],
  ]),
};

describe("saleBuyerName", () => {
  it("buyer first (archived ones kept), unknown buyer → Buyer", () => {
    expect(saleBuyerName({ buyerId: "b1" }, names)).toBe("Aling Nena");
    expect(saleBuyerName({ buyerId: "zz" }, names)).toBe("Buyer");
  });
  it("request: waiting, decided, rejected", () => {
    expect(saleBuyerName({ buyerRequestId: "r1" }, names)).toBe(
      "Nena (waiting)",
    );
    expect(saleBuyerName({ buyerRequestId: "r2" }, names)).toBe("Aling Nena");
    expect(saleBuyerName({ buyerRequestId: "r3" }, names)).toBe("Walk-in");
    expect(saleBuyerName({ buyerRequestId: "zz" }, names)).toBe("New buyer");
  });
  it("nothing → Walk-in", () => {
    expect(saleBuyerName({}, names)).toBe("Walk-in");
  });
});

describe("sameName", () => {
  it("ignores case and extra spaces", () => {
    expect(sameName("  aling   NENA ", "Aling Nena")).toBe(true);
    expect(sameName("Nena", "Aling Nena")).toBe(false);
  });
});
