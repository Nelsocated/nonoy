import type { BuyerRequestStatus } from "@/lib/api/types";
import { waitingLabel } from "@/lib/trip/buyer-name";

// Buyer shown for a sale on admin screens; same rule as the server's receipts
export function saleBuyerLabel(s: {
  buyer: { name: string } | null;
  buyerRequest?: { name: string; status: BuyerRequestStatus } | null;
}): string {
  if (s.buyer) return s.buyer.name;
  if (s.buyerRequest?.status === "PENDING")
    return waitingLabel(s.buyerRequest.name);
  return "Walk-in";
}
