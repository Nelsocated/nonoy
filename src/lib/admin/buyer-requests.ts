import type { PendingBuyerRequest } from "@/lib/api/types";
import { sameName } from "@/lib/trip/buyer-name";

// "Asked by Juan · Sep 26" (the business's day, Manila)
export function askedLine(r: PendingBuyerRequest) {
  const day = new Date(r.createdAtClient).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
  return `Asked by ${r.requestedBy.name} · ${day}`;
}

export const salesCount = (n: number) =>
  n === 0 ? "No sales" : `${n} sale${n === 1 ? "" : "s"}`;

export function decidedNote(
  kind: "approve" | "merge" | "reject",
  name: string,
) {
  if (kind === "approve") return `${name} added.`;
  if (kind === "merge") return `Moved to ${name}.`;
  return `${name} rejected.`;
}

export type NameClash = { name: string; archived: boolean };

// a saved buyer with the same name (active ones first): approving would make
// a second one
export function nameClash(
  name: string,
  buyers: { name: string; archivedAt: string | null }[],
): NameClash | null {
  const same = buyers.filter((b) => sameName(b.name, name));
  const b = same.find((x) => !x.archivedAt) ?? same[0];
  return b ? { name: b.name, archived: !!b.archivedAt } : null;
}

export const clashNote = (c: NameClash) =>
  c.archived
    ? `${c.name} was removed — restore it below, then use Same as….`
    : `${c.name} is already in the list — use Same as… instead.`;
