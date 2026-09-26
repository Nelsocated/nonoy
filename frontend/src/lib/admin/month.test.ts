import { describe, expect, it } from "vitest";
import type { DailyReport } from "@/lib/api/types";
import {
  clampMonth,
  daysUpTo,
  monthChoices,
  pickMonth,
  yearChoices,
  monthLabel,
  monthOf,
  monthRange,
  monthTotals,
  parseMonth,
  shiftMonth,
} from "./month";

type Day = DailyReport["days"][number];
const day = (
  d: string,
  over: Partial<{
    sales: string;
    cash: string;
    qr: string;
    count: number;
    chicken: number;
    kilo: string;
    exp: string;
    pickC: number;
    pickK: string;
  }> = {},
): Day => {
  const sales = over.sales ?? "0.00";
  const exp = over.exp ?? "0.00";
  return {
    day: d,
    pickups: { chicken: over.pickC ?? 0, kilo: over.pickK ?? "0.00" },
    sales: {
      count: over.count ?? 0,
      chicken: over.chicken ?? 0,
      kilo: over.kilo ?? "0.00",
      amount: sales,
      cash: over.cash ?? sales,
      qr: over.qr ?? "0.00",
      conflicts: 0,
    },
    expenses: { count: exp === "0.00" ? 0 : 1, amount: exp },
    net: "0.00", // not used by monthTotals (it recomputes from centavos)
  } as Day;
};

describe("month helpers", () => {
  it("gives the first and last day of a month, leap years included", () => {
    expect(monthRange("2026-09")).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(monthRange("2026-12")).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
    expect(monthRange("2028-02")).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
    expect(monthRange("2026-02")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });
  it("steps across years", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
    expect(shiftMonth("2026-09", 0)).toBe("2026-09");
  });
  it("names and finds months", () => {
    expect(monthOf("2026-09-26")).toBe("2026-09");
    expect(monthLabel("2026-09")).toBe("September 2026");
  });
  it("accepts only real YYYY-MM months from the address", () => {
    expect(parseMonth("2026-09")).toBe("2026-09");
    for (const bad of [
      null,
      "",
      "abc",
      "2026-13",
      "2026-00",
      "2026-9",
      "2026-09-01",
      "0050-01", // Date.UTC would read years 0-99 as 1900-1999
      "1999-12", // before the business used the app
    ])
      expect(parseMonth(bad)).toBeNull();
  });
  it("never goes past the current month", () => {
    expect(clampMonth("2027-01", "2026-09")).toBe("2026-09");
    expect(clampMonth("2026-08", "2026-09")).toBe("2026-08");
  });
  it("leaves out days after today", () => {
    const days = [day("2026-09-25"), day("2026-09-26"), day("2026-09-27")];
    expect(daysUpTo(days, "2026-09-26").map((d) => d.day)).toEqual([
      "2026-09-25",
      "2026-09-26",
    ]);
  });
  it("adds up a month to the centavo", () => {
    const t = monthTotals([
      day("2026-09-01", {
        sales: "100.10",
        cash: "100.10",
        count: 1,
        chicken: 2,
        kilo: "5.05",
        pickC: 10,
        pickK: "20.50",
      }),
      day("2026-09-02"),
      day("2026-09-03", {
        sales: "200.20",
        cash: "0.00",
        qr: "200.20",
        count: 2,
        chicken: 3,
        kilo: "7.10",
        exp: "50.05",
      }),
    ]);
    expect(t).toEqual({
      sales: 3,
      chicken: 5,
      kilo: "12.15",
      amount: "300.30",
      cash: "100.10",
      qr: "200.20",
      expenses: "50.05",
      net: "250.25",
      pickedChicken: 10,
      pickedKilo: "20.50",
      activeDays: 2,
    });
  });
  it("shows a loss as a negative net", () => {
    expect(monthTotals([day("2026-09-01", { exp: "80.00" })]).net).toBe(
      "-80.00",
    );
  });
  it("an empty month has no active days", () => {
    expect(monthTotals([day("2026-09-01"), day("2026-09-02")]).activeDays).toBe(
      0,
    );
    expect(monthTotals([]).amount).toBe("0.00");
  });
});

describe("month picker", () => {
  it("offers years from when the app started up to this year", () => {
    expect(yearChoices("2028-03")).toEqual([2028, 2027, 2026]);
    expect(yearChoices("2026-09")).toEqual([2026]);
  });
  it("lists the 12 months, later ones disabled in the current year", () => {
    const now = monthChoices(2026, "2026-09");
    expect(now).toHaveLength(12);
    expect(now[0]).toEqual({ value: "01", label: "January", disabled: false });
    expect(now[8]).toEqual({
      value: "09",
      label: "September",
      disabled: false,
    });
    expect(now[9].disabled).toBe(true);
    expect(monthChoices(2025, "2026-09").every((m) => !m.disabled)).toBe(true);
  });
  it("picking a year keeps the month unless it would be in the future", () => {
    expect(pickMonth("2027", "11", "2027-03")).toBe("2027-03");
    expect(pickMonth("2026", "11", "2027-03")).toBe("2026-11");
    expect(pickMonth("2026", "02", "2026-09")).toBe("2026-02");
  });
});
