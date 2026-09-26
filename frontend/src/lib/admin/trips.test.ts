import { describe, expect, it } from "vitest";
import { parseWorker, tripDay, tripsBack } from "./trips";

describe("tripDay", () => {
  it("is the start day in Manila time", () => {
    // 10:10 PM UTC on Sep 1 is 6:10 AM on Sep 2 in Manila
    expect(tripDay("2026-09-01T22:10:00Z")).toBe("Wed, Sep 2");
  });
});

describe("parseWorker", () => {
  it("keeps a user id", () => {
    const id = "3f9a2c7e-1b2d-4c5e-8f90-123456789abc";
    expect(parseWorker(id)).toBe(id);
  });
  it("drops anything else", () => {
    expect(parseWorker(null)).toBe("");
    expect(parseWorker("juan")).toBe("");
    expect(parseWorker("3f9a2c7e-1b2d-4c5e-8f90")).toBe("");
  });
});

describe("tripsBack", () => {
  it("allows the trips list, with or without filters", () => {
    expect(tripsBack("/admin/trips")).toBe("/admin/trips");
    expect(tripsBack("/admin/trips?month=2026-09&page=2")).toBe(
      "/admin/trips?month=2026-09&page=2",
    );
  });
  it("refuses other pages and other sites", () => {
    expect(tripsBack(undefined)).toBeNull();
    expect(tripsBack("/admin/users")).toBeNull();
    expect(tripsBack("https://evil.example/admin/trips")).toBeNull();
    expect(tripsBack("/admin/trips/../../x")).toBeNull();
    expect(tripsBack("/admin/trips?x=//evil")).toBeNull();
  });
});
