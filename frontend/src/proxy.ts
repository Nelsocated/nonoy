import { NextResponse, type NextRequest } from "next/server";
import { API_URL, INTERNAL_PROXY_SECRET } from "@/lib/env";
import { backendHeaders } from "@/lib/api/forward";
import { COOKIE, clearSessionCookies, parseUser, userAfterRefresh, writeSessionCookies } from "@/lib/auth/cookies";
import { refreshTokens } from "@/lib/auth/refresh";
import { canAccess, guard, homeFor } from "@/lib/auth/roles";
import { isExpiring } from "@/lib/auth/tokens";

// Runs before every page: signed-in / role checks, and refreshes the access token
// here because server components can't write cookies.
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const refresh = request.cookies.get(COOKIE.refresh)?.value;
  const user = refresh ? parseUser(request.cookies.get(COOKIE.user)?.value) : null;

  const decision = guard({ pathname, user, expired: searchParams.has("expired") });
  if (decision.action === "clear") {
    const res = NextResponse.next();
    clearSessionCookies(res.cookies);
    return res;
  }
  if (decision.action === "redirect") return NextResponse.redirect(new URL(decision.to, request.url));
  if (!user || !refresh || !isExpiring(request.cookies.get(COOKIE.access)?.value)) return NextResponse.next();

  const result = await refreshTokens(API_URL, refresh, backendHeaders(request.headers, INTERNAL_PROXY_SECRET));
  // backend down or throttling: keep the session and let the page show its own error
  if (result.status === "unavailable") return NextResponse.next();
  if (result.status === "invalid") {
    const res = NextResponse.redirect(new URL("/login?expired=1", request.url));
    clearSessionCookies(res.cookies);
    return res;
  }

  const { tokens } = result;
  const changed = userAfterRefresh(user, tokens.accessToken);
  // role changed since login (e.g. admin demoted): send them to their new area
  if (changed && !canAccess(changed.role, pathname)) {
    const res = NextResponse.redirect(new URL(homeFor(changed.role), request.url));
    writeSessionCookies(res.cookies, tokens, changed);
    return res;
  }

  // new token must reach this render (request) and the browser (response)
  request.cookies.set(COOKIE.access, tokens.accessToken);
  if (tokens.refreshToken) request.cookies.set(COOKIE.refresh, tokens.refreshToken);
  if (changed) request.cookies.set(COOKIE.user, JSON.stringify(changed));
  const res = NextResponse.next({ request: { headers: request.headers } });
  writeSessionCookies(res.cookies, tokens, changed);
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
