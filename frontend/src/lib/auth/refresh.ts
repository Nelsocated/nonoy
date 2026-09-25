import type { Tokens } from "@/lib/api/types";

// The backend rotates refresh tokens, so a second refresh with the same old token
// fails. Callers holding the same token share one request, and the result is kept
// briefly for requests that were already in flight with the old cookie.
const inflight = new Map<string, Promise<Tokens | null>>();
const KEEP_MS = 10_000;

export function refreshTokens(baseUrl: string, refreshToken: string, fetchImpl: typeof fetch = fetch) {
  let pending = inflight.get(refreshToken);
  if (!pending) {
    pending = (async () => {
      try {
        const res = await fetchImpl(`${baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
          cache: "no-store",
        });
        return res.ok ? ((await res.json()) as Tokens) : null;
      } catch {
        return null;
      } finally {
        setTimeout(() => inflight.delete(refreshToken), KEEP_MS).unref?.();
      }
    })();
    inflight.set(refreshToken, pending);
  }
  return pending;
}
