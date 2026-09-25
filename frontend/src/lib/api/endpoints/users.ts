import type { Http } from "../http";
import type {
  CreateUserInput,
  RegisterInput,
  UpdateUserInput,
  User,
} from "../types";

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
  /** OWNER/ADMIN — name and/or login phone */
  update: (id: string, input: UpdateUserInput) =>
    http.patch<User>(`/users/${id}`, input),
  /** OWNER/ADMIN — not your own; logs them out everywhere */
  resetPassword: (id: string, password: string) =>
    http.patch<User>(`/users/${id}/password`, { password }),
});
