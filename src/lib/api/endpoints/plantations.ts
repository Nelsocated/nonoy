import type { Http } from "../http";
import type { Plantation, PlantationInput, RemoveResult } from "../types";

export const plantations = (http: Http) => ({
  /** active only (what phones pull); archived: true = OWNER/ADMIN screen */
  list: ({ archived = false } = {}) =>
    http.get<Plantation[]>(
      "/plantations",
      archived ? { include: "archived" } : undefined,
    ),
  get: (id: string) => http.get<Plantation>(`/plantations/${id}`),
  /** OWNER/ADMIN */
  create: (input: PlantationInput) =>
    http.post<Plantation>("/plantations", input),
  /** OWNER/ADMIN */
  update: (id: string, input: Partial<PlantationInput>) =>
    http.patch<Plantation>(`/plantations/${id}`, input),
  /** OWNER/ADMIN — deleted if it has no pickups, archived if it has */
  remove: (id: string) => http.delete<RemoveResult>(`/plantations/${id}`),
  /** OWNER/ADMIN */
  restore: (id: string) => http.patch<Plantation>(`/plantations/${id}/restore`),
});
