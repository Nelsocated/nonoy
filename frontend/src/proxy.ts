import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "@/lib/env";
import { COOKIE, clearSessionCookies, parseUser, writeSessionCookies } from "@/lib/auth/cookies";
import { refreshTokens } from "@/lib/auth/refresh";
import { guard } from "@/lib/auth/roles";
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

  const tokens = await refreshTokens(API_URL, refresh);
  if (!tokens) {
    const res = NextResponse.redirect(new URL("/login?expired=1", request.url));
    clearSessionCookies(res.cookies);
    return res;
  }
  // new token must reach this render (request) and the browser (response)
  request.cookies.set(COOKIE.access, tokens.accessToken);
  request.cookies.set(COOKIE.refresh, tokens.refreshToken);
  const res = NextResponse.next({ request: { headers: request.headers } });
  writeSessionCookies(res.cookies, tokens);
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
