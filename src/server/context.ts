import {
  COOKIE,
  clearSessionCookies,
  cookieOptions,
  parseUser,
  userAfterRefresh,
  writeSessionCookies,
} from "@/lib/auth/cookies";
import { OFFLINE_USER_HEADER } from "@/lib/trpc/client";
import type { Resolved } from "./auth/session";
import { clientIp } from "./client-ip";
import type { Services } from "./services";
import type { Ctx } from "./trpc";

// what next/headers cookies() offers in a route handler
type Jar = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: typeof cookieOptions): unknown;
  delete(name: string): unknown;
};

// Reads the signed-in user from the cookies; an expired access token is
// refreshed once and the rotated cookies go back on the response.
export async function buildContext(
  req: Request,
  jar: Jar,
  resolve: (jar: Jar) => Promise<Resolved>,
  services: Services,
): Promise<Ctx> {
  const r = await resolve(jar);
  if (r.tokens) {
    const user = parseUser(jar.get(COOKIE.user)?.value);
    writeSessionCookies(
      jar,
      r.tokens,
      userAfterRefresh(user, r.tokens.accessToken),
    );
  } else if (r.invalid) {
    clearSessionCookies(jar);
  }
  return {
    user: r.user,
    ip: clientIp(req.headers),
    offlineUser: req.headers.get(OFFLINE_USER_HEADER),
    sessionUnavailable: !!r.unavailable,
    services,
  };
}
