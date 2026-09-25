import type {
  Problem,
  Recount,
  RecountProblem,
  Sale,
  SaleProblem,
  TripDetail,
} from "@/lib/api/types";
import { fromCenti, toCenti } from "@/lib/trip/money";

type Entry<T extends string, R> = {
  key: string;
  at: string;
  type: T;
  row: R;
  problem: Problem | null;
};
export type TimelineEntry =
  | Entry<"pickup", TripDetail["pickups"][number]>
  | Entry<"sale", TripDetail["sales"][number]>
  | Entry<"recount", Recount>
  | Entry<"expense", TripDetail["expenses"][number]>;

// same rule as the server's problems list; prices compared as numbers
const saleProblem = (s: Sale, worker: TripDetail["worker"]) =>
  s.syncStatus === "CONFLICT" ||
  (s.pricePerKilo != null &&
    s.listPricePerKilo != null &&
    toCenti(s.pricePerKilo) !== toCenti(s.listPricePerKilo))
    ? ({ ...s, kind: "sale", worker } as SaleProblem)
    : null;

const recountProblem = (r: Recount, worker: TripDetail["worker"]) =>
  r.discrepancyFlagged
    ? ({
        ...r,
        kind: "recount",
        worker,
        chickenDifference: r.countedChicken - r.expectedChicken,
        kiloDifference: fromCenti(
          toCenti(r.countedKilo) - toCenti(r.expectedKilo),
        ),
      } as RecountProblem)
    : null;

// Everything recorded on a trip, oldest first, with problems attached.
export function tripTimeline(t: TripDetail): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...t.pickups.map((row) => ({
      key: `pickup:${row.id}`,
      at: row.createdAtClient,
      type: "pickup" as const,
      row,
      problem: null,
    })),
    ...t.sales.map((row) => ({
      key: `sale:${row.id}`,
      at: row.createdAtClient,
      type: "sale" as const,
      row,
      problem: saleProblem(row, t.worker),
    })),
    ...t.recounts.map((row) => ({
      key: `recount:${row.id}`,
      at: row.createdAtClient,
      type: "recount" as const,
      row,
      problem: recountProblem(row, t.worker),
    })),
    ...t.expenses.map((row) => ({
      key: `expense:${row.id}`,
      at: row.createdAtClient,
      type: "expense" as const,
      row,
      problem: null,
    })),
  ];
  return entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
