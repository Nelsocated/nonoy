// Reads a JWT's exp without verifying it — only to decide when to refresh.
export function tokenExpiry(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

const SKEW_MS = 30_000;

export function isExpiring(token: string | undefined, now = Date.now()) {
  const exp = token ? tokenExpiry(token) : null;
  return exp === null || exp - now < SKEW_MS;
}
