import type { RefreshedTokens } from "@/lib/api/types";

// "invalid" = the backend rejected the token (log out); "unavailable" = backend down,
// erroring or throttling — the token may still be fine, so keep the session.
export type RefreshResult =
  | { status: "ok"; tokens: RefreshedTokens }
  | { status: "invalid" }
  | { status: "unavailable" };

// The backend rotates refresh tokens, so callers holding the same token share one
// request, and the result is kept briefly for requests already in flight with the
// old cookie. (Across processes, the backend's 10s grace window covers the race.)
const inflight = new Map<string, Promise<RefreshResult>>();
const KEEP_MS = 10_000;

export function refreshTokens(
  baseUrl: string,
  refreshToken: string,
  headers: Record<string, string> = {},
  fetchImpl: typeof fetch = fetch,
) {
  let pending = inflight.get(refreshToken);
  if (!pending) {
    pending = (async (): Promise<RefreshResult> => {
      try {
        const res = await fetchImpl(`${baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
          cache: "no-store",
        });
        if (res.ok)
          return {
            status: "ok",
            tokens: (await res.json()) as RefreshedTokens,
          };
        return res.status === 400 || res.status === 401
          ? { status: "invalid" }
          : { status: "unavailable" };
      } catch {
        return { status: "unavailable" };
      } finally {
        setTimeout(() => inflight.delete(refreshToken), KEEP_MS).unref?.();
      }
    })();
    inflight.set(refreshToken, pending);
  }
  return pending;
}
