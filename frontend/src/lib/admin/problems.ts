import type { Problem } from "@/lib/api/types";
import { peso } from "@/lib/trip/money";

const chickens = (n: number) => `${n} chicken${n === 1 ? "" : "s"}`;

// One plain sentence per problem for the dashboard and trip timeline.
export function problemSentence(p: Problem): string {
  if (p.kind === "recount") {
    const kilo = p.kiloDifference.replace("-", "");
    const short = p.chickenDifference < 0 || p.kiloDifference.startsWith("-");
    const parts = [
      p.chickenDifference !== 0 && chickens(Math.abs(p.chickenDifference)),
      kilo !== "0.00" && `${kilo} kg`,
    ].filter(Boolean);
    return `Recount ${short ? "short" : "over"} ${parts.join(" / ")}`;
  }
  // a conflict is the bigger problem, so it wins over a price change
  if (p.syncStatus === "CONFLICT")
    return `Sale after trip ended — ${p.conflictReason ?? "check this sale"}`;
  return `Price changed ${peso(p.pricePerKilo ?? "0")} (owner ${peso(
    p.listPricePerKilo ?? "0",
  )}) · ${p.buyer?.name ?? "Walk-in"}`;
}
