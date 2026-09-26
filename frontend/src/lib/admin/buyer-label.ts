import type { BuyerRequestStatus } from "@/lib/api/types";

// Buyer shown for a sale on admin screens; same rule as the server's receipts
export function saleBuyerLabel(s: {
  buyer: { name: string } | null;
  buyerRequest?: { name: string; status: BuyerRequestStatus } | null;
}): string {
  if (s.buyer) return s.buyer.name;
  if (s.buyerRequest?.status === "PENDING")
    return `${s.buyerRequest.name} (waiting)`;
  return "Walk-in";
}
