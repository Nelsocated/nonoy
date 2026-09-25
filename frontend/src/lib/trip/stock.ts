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
// No numbers for workers: they must not learn the stock, or the recount isn't
// blind. Owners/admins may see it (showStock).
export function overSell(
  stock: Stock,
  chicken: number,
  kilo: string,
  { showStock = false } = {},
): string | null {
  const overChicken = chicken > stock.chicken;
  const overKilo = toCenti(kilo) > toCenti(stock.kilo);
  if (!overChicken && !overKilo) return null;
  if (showStock) {
    const parts: string[] = [];
    if (overChicken) parts.push(`${Math.max(stock.chicken, 0)} chickens`);
    if (overKilo)
      parts.push(`${fromCenti(Math.max(toCenti(stock.kilo), 0))} kg`);
    return `Only ${parts.join(" / ")} left on the truck.`;
  }
  const parts = [overChicken && "chickens", overKilo && "kilos"].filter(
    Boolean,
  );
  return `This sale has more ${parts.join(" and ")} than should be on the truck.`;
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
