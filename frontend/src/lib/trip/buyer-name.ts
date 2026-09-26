import type { LocalBuyerRequest } from "@/lib/offline/db";

export type BuyerNames = {
  /** every buyer the phone knows (archived too) */
  buyers: Map<string, string>;
  /** this worker's new-buyer requests */
  requests: Map<string, Pick<LocalBuyerRequest, "name" | "status" | "buyerId">>;
};

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
  if (r.status === "PENDING") return `${r.name} (waiting)`;
  if (r.buyerId) return buyers.get(r.buyerId) ?? r.name;
  return "Walk-in"; // rejected
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

// "aling  nena" is the same buyer as "Aling Nena"
export const sameName = (a: string, b: string) => norm(a) === norm(b);
