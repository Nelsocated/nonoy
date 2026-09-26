import type { Problem } from "@/lib/api/types";
import { peso } from "@/lib/trip/money";
import { saleBuyerLabel } from "./buyer-label";

const chickens = (n: number) => `${n} chicken${n === 1 ? "" : "s"}`;

// One plain sentence per problem for the dashboard and trip timeline.
export function problemSentence(p: Problem): string {
  if (p.kind === "recount") {
    const kiloShort = p.kiloDifference.startsWith("-");
    const kilo = p.kiloDifference.replace("-", "");
    const chickenPart =
      p.chickenDifference !== 0 && chickens(Math.abs(p.chickenDifference));
    const kiloPart = kilo !== "0.00" && `${kilo} kg`;
    // same direction: "short 3 chickens / 4.50 kg"; mixed: say each one
    if (chickenPart && kiloPart && p.chickenDifference < 0 !== kiloShort)
      return `Recount ${p.chickenDifference < 0 ? "short" : "over"} ${chickenPart}, ${kiloShort ? "short" : "over"} ${kiloPart}`;
    const short = p.chickenDifference < 0 || kiloShort;
    return `Recount ${short ? "short" : "over"} ${[chickenPart, kiloPart].filter(Boolean).join(" / ")}`;
  }
  // a conflict is the bigger problem, so it wins over a price change; the
  // server's only reason is "recorded after its trip had ended", so say which sale
  if (p.syncStatus === "CONFLICT")
    return `Sale after trip ended · ${saleBuyerLabel(p)} · ${peso(p.amount)}`;
  return `Price changed ${peso(p.pricePerKilo ?? "0")} (owner ${peso(
    p.listPricePerKilo ?? "0",
  )}) · ${saleBuyerLabel(p)}`;
}
