import type { Http } from "../http";
import type { CreatePickupInput, Pickup } from "../types";

export const pickups = (http: Http) => ({
  create: (input: CreatePickupInput) => http.post<Pickup>("/pickups", input),
  /** OWNER/ADMIN */
  list: () => http.get<Pickup[]>("/pickups"),
});
