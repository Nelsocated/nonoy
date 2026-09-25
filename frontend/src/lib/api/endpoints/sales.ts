import type { Http } from "../http";
import type { CreateSaleInput, Sale } from "../types";

export const sales = (http: Http) => ({
  create: (input: CreateSaleInput) => http.post<Sale>("/sales", input),
  /** OWNER/ADMIN — `conflicted: true` lists only sales flagged at sync */
  list: (opts: { conflicted?: boolean } = {}) =>
    http.get<Sale[]>("/sales", {
      conflicted: opts.conflicted ? "true" : undefined,
    }),
});
