import { describe, expect, it } from "vitest";
import {
  matchBuyer,
  sameName,
  saleBuyerName,
  type BuyerNames,
  waitingOf,
} from "./buyer-name";

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

describe("matchBuyer", () => {
  const active = new Map([["b1", "Aling Nena"]]);
  const waiting = [{ clientId: "r1", name: "Mang Ben" }];
  it("an existing buyer wins", () => {
    expect(matchBuyer(" aling nena ", active, waiting)).toEqual({
      buyerId: "b1",
      name: "Aling Nena",
    });
  });
  it("then one of my waiting new buyers", () => {
    expect(matchBuyer("MANG BEN", active, waiting)).toEqual({
      buyerRequestId: "r1",
    });
  });
  it("otherwise nothing: it's really new", () => {
    expect(matchBuyer("Nena", active, waiting)).toBeNull();
  });
});

describe("waitingOf", () => {
  const req = (clientId: string, name: string, over = {}) => ({
    clientId,
    userId: "w1",
    createdAtClient: "",
    name,
    location: null,
    status: "PENDING" as const,
    buyerId: null,
    state: "synced" as const,
    ...over,
  });
  it("still-waiting ones by name; decided or failed-to-sync ones left out", () => {
    expect(
      waitingOf([
        req("r1", "Nena"),
        req("r2", "Ben", { state: "pending" }),
        req("r3", "Carlo", { status: "APPROVED" }),
        req("r4", "Dodong", { state: "error" }),
      ]).map((r) => r.clientId),
    ).toEqual(["r2", "r1"]);
  });
});
