import type { Http } from "../http";
import type { Buyer, BuyerInput } from "../types";

export const buyers = (http: Http) => ({
  list: () => http.get<Buyer[]>("/buyers"),
  get: (id: string) => http.get<Buyer>(`/buyers/${id}`),
  create: (input: BuyerInput) => http.post<Buyer>("/buyers", input),
  /** OWNER/ADMIN */
  update: (id: string, input: Partial<BuyerInput>) => http.patch<Buyer>(`/buyers/${id}`, input),
  /** OWNER/ADMIN */
  remove: (id: string) => http.delete<Buyer>(`/buyers/${id}`),
});
