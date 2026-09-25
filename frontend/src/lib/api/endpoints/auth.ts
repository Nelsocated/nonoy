import type { Http } from "../http";
import type { LoginInput, LoginResponse, RefreshedTokens } from "../types";

export const auth = (http: Http) => ({
  login: (input: LoginInput) => http.post<LoginResponse>("/auth/login", input),
  refresh: (refreshToken: string) =>
    http.post<RefreshedTokens>("/auth/refresh", { refreshToken }),
  logout: () => http.post<{ message: string }>("/auth/logout"),
});
