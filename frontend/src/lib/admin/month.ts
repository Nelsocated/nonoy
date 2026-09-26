import type { DailyReport } from "@/lib/api/types";
import { fromCenti, toCenti } from "@/lib/trip/money";

// A calendar month as "YYYY-MM". Days are "YYYY-MM-DD" in the report time
// zone (the server's), so no Date time-zone math is needed here.
export type Month = string;

const pad = (n: number) => String(n).padStart(2, "0");
const split = (m: Month) => m.split("-").map(Number) as [number, number];

export const monthOf = (day: string): Month => day.slice(0, 7);

export function monthRange(m: Month) {
  const [y, mo] = split(m);
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate(); // day 0 of next month
  return { from: `${m}-01`, to: `${m}-${pad(last)}` };
}

export function shiftMonth(m: Month, by: number): Month {
  const [y, mo] = split(m);
  const d = new Date(Date.UTC(y, mo - 1 + by, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function monthLabel(m: Month) {
  const [y, mo] = split(m);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// from ?month= — anything else means "the current month". Years start at
// 2000: Date.UTC reads 0-99 as 1900s, and nothing older exists anyway.
export function parseMonth(raw: string | null): Month | null {
  const m = /^(2\d{3})-(\d{2})$/.exec(raw ?? "");
  return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? m[0] : null;
}

export const clampMonth = (m: Month, current: Month): Month =>
  m > current ? current : m;

export const daysUpTo = <T extends { day: string }>(days: T[], today: string) =>
  days.filter((d) => d.day <= today);

export type MonthTotals = {
  sales: number;
  chicken: number;
  kilo: string;
  amount: string;
  cash: string;
  qr: string;
  expenses: string;
  net: string;
  pickedChicken: number;
  pickedKilo: string;
  activeDays: number;
};

// Whole-month totals from the daily rows, in centavos so they match the server.
export function monthTotals(days: DailyReport["days"]): MonthTotals {
  const c = { kilo: 0, amount: 0, cash: 0, qr: 0, exp: 0, pickKilo: 0 };
  let sales = 0;
  let chicken = 0;
  let pickedChicken = 0;
  let activeDays = 0;
  for (const d of days) {
    sales += d.sales.count;
    chicken += d.sales.chicken;
    pickedChicken += d.pickups.chicken;
    c.kilo += toCenti(d.sales.kilo);
    c.amount += toCenti(d.sales.amount);
    c.cash += toCenti(d.sales.cash);
    c.qr += toCenti(d.sales.qr);
    c.exp += toCenti(d.expenses.amount);
    c.pickKilo += toCenti(d.pickups.kilo);
    if (d.sales.count || d.expenses.count || d.pickups.chicken) activeDays++;
  }
  return {
    sales,
    chicken,
    kilo: fromCenti(c.kilo),
    amount: fromCenti(c.amount),
    cash: fromCenti(c.cash),
    qr: fromCenti(c.qr),
    expenses: fromCenti(c.exp),
    net: fromCenti(c.amount - c.exp),
    pickedChicken,
    pickedKilo: fromCenti(c.pickKilo),
    activeDays,
  };
}
