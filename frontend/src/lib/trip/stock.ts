import { fromCenti, toCenti } from "./money";

type Load = { chickenCount: number; totalKilo: string };
export type Stock = { chicken: number; kilo: string };

// What should be on the truck: picked up minus sold, counting records that
// haven't synced yet (the phone is the source of truth while offline).
export function stockOnTruck(pickups: Load[], sales: Load[]): Stock {
  const sum = (rows: Load[]) =>
    rows.reduce(
      (acc, r) => ({
        chicken: acc.chicken + r.chickenCount,
        centi: acc.centi + toCenti(r.totalKilo),
      }),
      { chicken: 0, centi: 0 },
    );
  const inn = sum(pickups);
  const out = sum(sales);
  return {
    chicken: inn.chicken - out.chicken,
    kilo: fromCenti(inn.centi - out.centi),
  };
}

// Selling more than the truck holds is allowed (counts can be off) — just warn.
// No numbers: the worker must not learn the stock, or the recount isn't blind.
export function overSell(
  stock: Stock,
  chicken: number,
  kilo: string,
): string | null {
  const parts: string[] = [];
  if (chicken > stock.chicken) parts.push("chickens");
  if (toCenti(kilo) > toCenti(stock.kilo)) parts.push("kilos");
  return parts.length
    ? `This sale has more ${parts.join(" and ")} than should be on the truck.`
    : null;
}

// counted − expected: negative = short, positive = over
export function recountResult(
  expected: Stock,
  counted: { chicken: number; kilo: string },
) {
  const chickenDiff = counted.chicken - expected.chicken;
  const kiloCenti = toCenti(counted.kilo) - toCenti(expected.kilo);
  return {
    matches: chickenDiff === 0 && kiloCenti === 0,
    chickenDiff,
    kiloDiff: fromCenti(kiloCenti),
  };
}
