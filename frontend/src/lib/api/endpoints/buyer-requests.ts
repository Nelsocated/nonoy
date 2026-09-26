import type { Http } from "../http";
import type {
  Buyer,
  BuyerRequestStatus,
  MyBuyerRequest,
  PendingBuyerRequest,
} from "../types";

type Decided = { id: string; status: BuyerRequestStatus; buyer: Buyer | null };

export const buyerRequests = (http: Http) => ({
  /** OWNER/ADMIN — waiting ones, oldest first */
  pending: () => http.get<PendingBuyerRequest[]>("/buyer-requests"),
  /** the caller's own (phones name their sales with it) */
  mine: () => http.get<MyBuyerRequest[]>("/buyer-requests/mine"),
  /** OWNER/ADMIN — new buyer, possibly with a fixed name/place */
  approve: (id: string, input: { name: string; location: string | null }) =>
    http.post<Decided>(`/buyer-requests/${id}/approve`, input),
  /** OWNER/ADMIN — it's an existing buyer; its sales move there */
  merge: (id: string, buyerId: string) =>
    http.post<Decided>(`/buyer-requests/${id}/merge`, { buyerId }),
  /** OWNER/ADMIN — its sales stay walk-in */
  reject: (id: string) => http.post<Decided>(`/buyer-requests/${id}/reject`),
});
