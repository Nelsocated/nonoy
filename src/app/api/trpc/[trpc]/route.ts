import { cookies } from "next/headers";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import {
  COOKIE,
  clearSessionCookies,
  parseUser,
  userAfterRefresh,
  writeSessionCookies,
} from "@/lib/auth/cookies";
import { OFFLINE_USER_HEADER } from "@/lib/trpc/client";
import { session } from "@/server/auth";
import { db } from "@/server/db";
import { appRouter } from "@/server/routers/_app";
import { createServices } from "@/server/services";
import type { Ctx } from "@/server/trpc";

// Vercel sets x-forwarded-for itself; the first entry is the real client.
const clientIp = (h: Headers) =>
  h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  h.get("x-real-ip")?.trim() ||
  "unknown";

// Reads the signed-in user from the cookies; an expired access token is
// refreshed once here and the rotated cookies go back on the response.
async function createContext(req: Request): Promise<Ctx> {
  const jar = await cookies();
  const r = await session.resolve(jar);
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
    services: createServices(db),
  };
}

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ error, path }) => {
      if (error.code === "INTERNAL_SERVER_ERROR")
        console.error(`tRPC ${path}:`, error.cause ?? error);
    },
  });
}

export { handler as GET, handler as POST };
