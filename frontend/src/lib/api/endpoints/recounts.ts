import type { Http } from "../http";
import type { CreateRecountInput, Recount } from "../types";

export const recounts = (http: Http) => ({
  create: (input: CreateRecountInput) => http.post<Recount>("/recounts", input),
  /** OWNER/ADMIN */
  list: () => http.get<Recount[]>("/recounts"),
});
