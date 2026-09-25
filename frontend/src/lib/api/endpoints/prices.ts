import type { Http } from "../http";
import type { Price } from "../types";

export const prices = (http: Http) => ({
  /** any role — phones keep a copy for offline sales; null until the owner sets one */
  current: () => http.get<Price | null>("/prices/current"),
  /** OWNER/ADMIN — newest first */
  history: () => http.get<Price[]>("/prices"),
  /** OWNER/ADMIN */
  set: (pricePerKilo: string) => http.post<Price>("/prices", { pricePerKilo }),
});
