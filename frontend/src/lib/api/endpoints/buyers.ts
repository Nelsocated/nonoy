import type { Http } from "../http";
import type { Buyer, BuyerInput, RemoveResult } from "../types";

export const buyers = (http: Http) => ({
  /** active only by default; archived: true adds removed ones (admin screen, and phones for old names) */
  list: ({ archived = false } = {}) =>
    http.get<Buyer[]>(
      "/buyers",
      archived ? { include: "archived" } : undefined,
    ),
  get: (id: string) => http.get<Buyer>(`/buyers/${id}`),
  create: (input: BuyerInput) => http.post<Buyer>("/buyers", input),
  /** OWNER/ADMIN */
  update: (id: string, input: Partial<BuyerInput>) =>
    http.patch<Buyer>(`/buyers/${id}`, input),
  /** OWNER/ADMIN — deleted if it has no sales, archived if it has */
  remove: (id: string) => http.delete<RemoveResult>(`/buyers/${id}`),
  /** OWNER/ADMIN */
  restore: (id: string) => http.patch<Buyer>(`/buyers/${id}/restore`),
});
