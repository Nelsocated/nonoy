import type { Http } from "../http";
import type { CreateSaleInput, Sale, SaleReceipt } from "../types";

export const sales = (http: Http) => ({
  create: (input: CreateSaleInput) => http.post<Sale>("/sales", input),
  /** OWNER/ADMIN — `conflicted: true` lists only sales flagged at sync */
  list: (opts: { conflicted?: boolean } = {}) =>
    http.get<Sale[]>("/sales", {
      conflicted: opts.conflicted ? "true" : undefined,
    }),
  /** OWNER/ADMIN — one sale's receipt (buyerName null = walk-in) */
  receipt: (clientId: string) =>
    http.get<SaleReceipt>(`/sales/${clientId}/receipt`),
});
