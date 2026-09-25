import type { Http } from "../http";
import type { CreateTripInput, EndTripInput, Trip } from "../types";

export const trips = (http: Http) => ({
  start: (input: CreateTripInput) => http.post<Trip>("/trips", input),
  end: (id: string, input: EndTripInput) => http.patch<Trip>(`/trips/${id}/end`, input),
  mine: () => http.get<Trip[]>("/trips/me"),
  /** OWNER/ADMIN */
  list: () => http.get<Trip[]>("/trips"),
});
