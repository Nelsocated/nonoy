// For server components and server actions: talks to Nest directly.
// proxy.ts has already refreshed the access token before the page renders.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createApi } from ".";
import { createHttp } from "./http";
import { API_URL } from "@/lib/env";
import { COOKIE } from "@/lib/auth/cookies";

export const serverApi = createApi(
  createHttp({
    baseUrl: API_URL,
    headers: async (): Promise<HeadersInit> => {
      const token = (await cookies()).get(COOKIE.access)?.value;
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    // deactivated user or revoked session — proxy clears cookies on this URL
    onUnauthorized: () => redirect("/login?expired=1"),
  }),
);

// unauthenticated calls (login)
export const publicApi = createApi(createHttp({ baseUrl: API_URL }));
