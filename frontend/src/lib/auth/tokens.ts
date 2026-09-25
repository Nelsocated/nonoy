import type { Role } from "@/lib/api/types";

// Reads a JWT payload without verifying it — only for refresh timing and the
// role hint in the user cookie. The backend verifies every request.
function payload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function tokenExpiry(token: string): number | null {
  const exp = payload(token)?.exp;
  return typeof exp === "number" ? exp * 1000 : null;
}

const ROLES: Role[] = ["OWNER", "ADMIN", "WORKER"];

// the backend re-reads the role from the DB on every refresh
export function tokenRole(token: string): Role | null {
  const role = payload(token)?.role;
  return ROLES.includes(role as Role) ? (role as Role) : null;
}

const SKEW_MS = 30_000;

export function isExpiring(token: string | undefined, now = Date.now()) {
  const exp = token ? tokenExpiry(token) : null;
  return exp === null || exp - now < SKEW_MS;
}
