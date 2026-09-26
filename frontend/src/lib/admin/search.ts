import type { RemoveResult } from "@/lib/api/types";

// list search on the admin screens: any field, case-insensitive
export function matchesSearch(
  fields: (string | null | undefined)[],
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  return !q || fields.some((f) => f?.toLowerCase().includes(q));
}

// what the server did on Remove: deleted when unused, archived when it has history
export function removedMessage(r: RemoveResult, noun: "sale" | "pickup") {
  if (r.result === "deleted") return "Deleted.";
  // no sales, but a new-buyer request decided in the last 60 days points at it
  if (r.uses === 0)
    return "Archived — a recent new buyer request uses it. It can be deleted 60 days after that request was checked.";
  return `Archived — it has ${r.uses} ${noun}${r.uses === 1 ? "" : "s"}, so it's kept for history.`;
}
