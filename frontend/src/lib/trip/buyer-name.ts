import type { LocalBuyerRequest } from "@/lib/offline/db";

export type BuyerNames = {
  /** every buyer the phone knows (archived too) */
  buyers: Map<string, string>;
  /** this worker's new-buyer requests */
  requests: Map<string, Pick<LocalBuyerRequest, "name" | "status" | "buyerId">>;
};

// A new buyer the worker typed, until the owner decides. The admin screens
// and the server's receipts show the same.
export const waitingLabel = (name: string) => `${name} (waiting)`;

// The buyer a sale shows on the phone: the buyer, else the new buyer the
// worker typed ("(waiting)" until the owner decides), else Walk-in.
export function saleBuyerName(
  sale: { buyerId?: string | null; buyerRequestId?: string | null },
  { buyers, requests }: BuyerNames,
): string {
  // unknown = not pulled yet (or deleted)
  if (sale.buyerId) return buyers.get(sale.buyerId) ?? "Buyer";
  if (!sale.buyerRequestId) return "Walk-in";
  const r = requests.get(sale.buyerRequestId);
  if (!r) return "New buyer";
  if (r.status === "PENDING") return waitingLabel(r.name);
  if (r.buyerId) return buyers.get(r.buyerId) ?? r.name;
  return "Walk-in"; // rejected
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

// "aling  nena" is the same buyer as "Aling Nena"
export const sameName = (a: string, b: string) => norm(a) === norm(b);

// Before asking for a new buyer: is it already in the list, or one this
// worker already asked for?
export function matchBuyer(
  name: string,
  activeBuyers: Map<string, string>,
  waiting: { clientId: string; name: string }[],
): { buyerId: string; name: string } | { buyerRequestId: string } | null {
  for (const [buyerId, n] of activeBuyers)
    if (sameName(n, name)) return { buyerId, name: n };
  const r = waiting.find((w) => sameName(w.name, name));
  return r ? { buyerRequestId: r.clientId } : null;
}

// New buyers a sale can reuse: still waiting, by name. One whose own sync
// failed is left out: a sale pointing at it would fail too.
export const waitingOf = (requests: LocalBuyerRequest[]) =>
  requests
    .filter((r) => r.status === "PENDING" && r.state !== "error")
    .sort((a, b) => a.name.localeCompare(b.name));
