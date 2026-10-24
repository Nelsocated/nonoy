// For server components and server actions: talks to Nest directly.
// proxy.ts has already refreshed the access token before the page renders.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createApi } from ".";
import { createHttp } from "./http";
import { backendHeaders } from "./forward";
import { API_URL, INTERNAL_PROXY_SECRET } from "@/lib/env";
import { COOKIE } from "@/lib/auth/cookies";

// the browser's IP for the backend's per-user rate limit
export async function forwardingHeaders() {
  return backendHeaders(await headers(), INTERNAL_PROXY_SECRET);
}

// NOTE: on 401 this throws Next's redirect — don't swallow it in a bare try/catch.
export const serverApi = createApi(
  createHttp({
    baseUrl: API_URL,
    headers: async (): Promise<HeadersInit> => {
      const token = (await cookies()).get(COOKIE.access)?.value;
      return {
        ...(await forwardingHeaders()),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
    },
    // deactivated user or revoked session — proxy clears cookies on this URL
    onUnauthorized: () => redirect("/login?expired=1"),
  }),
);

// unauthenticated calls (login)
export const publicApi = createApi(
  createHttp({ baseUrl: API_URL, headers: forwardingHeaders }),
);
