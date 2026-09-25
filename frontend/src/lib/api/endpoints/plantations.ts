import type { Http } from "../http";
import type { Plantation, PlantationInput } from "../types";

export const plantations = (http: Http) => ({
  list: () => http.get<Plantation[]>("/plantations"),
  get: (id: string) => http.get<Plantation>(`/plantations/${id}`),
  /** OWNER/ADMIN */
  create: (input: PlantationInput) =>
    http.post<Plantation>("/plantations", input),
  /** OWNER/ADMIN */
  update: (id: string, input: Partial<PlantationInput>) =>
    http.patch<Plantation>(`/plantations/${id}`, input),
  /** OWNER/ADMIN */
  remove: (id: string) => http.delete<Plantation>(`/plantations/${id}`),
});
