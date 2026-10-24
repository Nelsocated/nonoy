import type { RefreshedTokens, Role, SessionUser } from "@/lib/api/types";
import { tokenRole } from "./tokens";

export const COOKIE = {
  access: "nonoy_access",
  refresh: "nonoy_refresh",
  user: "nonoy_user",
} as const;

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // outlives the refresh token; the backend decides real expiry
};

// Works with both next/headers cookies() and NextResponse.cookies / NextRequest.cookies
type Jar = {
  set(name: string, value: string, options?: typeof cookieOptions): unknown;
  delete(name: string): unknown;
};

const ROLES: Role[] = ["OWNER", "ADMIN", "WORKER"];

export function parseUser(raw?: string): SessionUser | null {
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as Partial<SessionUser>;
    if (
      typeof u.id === "string" &&
      typeof u.name === "string" &&
      ROLES.includes(u.role as Role)
    ) {
      return { id: u.id, name: u.name, role: u.role as Role };
    }
  } catch {}
  return null;
}

export function writeSessionCookies(
  jar: Jar,
  tokens: RefreshedTokens,
  user?: SessionUser,
) {
  jar.set(COOKIE.access, tokens.accessToken, cookieOptions);
  if (tokens.refreshToken)
    jar.set(COOKIE.refresh, tokens.refreshToken, cookieOptions);
  if (user) jar.set(COOKIE.user, JSON.stringify(user), cookieOptions);
}

export function clearSessionCookies(jar: Jar) {
  for (const name of Object.values(COOKIE)) jar.delete(name);
}

// The user cookie is written at login; the backend puts the current role (from the
// DB) in every refreshed access token, so pick up a role change from there.
export function userAfterRefresh(
  user: SessionUser | null,
  accessToken: string,
): SessionUser | undefined {
  const role = tokenRole(accessToken);
  if (!user || !role || role === user.role) return undefined;
  return { ...user, role };
}
