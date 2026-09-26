import type { PendingBuyerRequest } from "@/lib/api/types";

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
