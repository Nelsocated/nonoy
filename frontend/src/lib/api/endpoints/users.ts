import type { Http } from "../http";
import type { CreateUserInput, RegisterInput, User } from "../types";

export const users = (http: Http) => ({
  register: (input: RegisterInput) => http.post<User>("/users/register", input),
  /** OWNER/ADMIN — create staff with a chosen role */
  create: (input: CreateUserInput) => http.post<User>("/users", input),
  me: () => http.get<User>("/users/me"),
  /** OWNER/ADMIN — only the roles the caller may manage */
  list: () => http.get<User[]>("/users"),
  /** OWNER/ADMIN */
  setActive: (id: string, isActive: boolean) =>
    http.patch<User>(`/users/${id}/active`, { isActive }),
});
