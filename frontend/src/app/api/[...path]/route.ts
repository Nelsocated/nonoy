import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "@/lib/env";
import { isForwardable, targetUrl } from "@/lib/api/forward";
import { COOKIE, clearSessionCookies, writeSessionCookies } from "@/lib/auth/cookies";
import { refreshTokens } from "@/lib/auth/refresh";

type Ctx = { params: Promise<{ path: string[] }> };

// Browser → /api/<path> → Nest /<path>, with the access token from the cookie.
// On 401 it refreshes once and retries, saving the rotated tokens.
async function forward(request: NextRequest, { params }: Ctx) {
  const { path } = await params;
  if (!isForwardable(path)) return NextResponse.json({ statusCode: 404, message: "Not found" }, { status: 404 });

  const jar = await cookies();
  const refresh = jar.get(COOKIE.refresh)?.value;
  if (!refresh) return NextResponse.json({ statusCode: 401, message: "Not signed in" }, { status: 401 });

  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await request.text();
  const url = targetUrl(API_URL, path, request.nextUrl.search);
  const send = (token?: string) =>
    fetch(url, {
      method,
      body: body || undefined,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": request.headers.get("content-type") ?? "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await send(jar.get(COOKIE.access)?.value);
  const tokens = res.status === 401 ? await refreshTokens(API_URL, refresh) : null;
  if (tokens) res = await send(tokens.accessToken);

  const out = new NextResponse(res.status === 204 ? null : await res.arrayBuffer(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
  if (tokens) writeSessionCookies(out.cookies, tokens);
  else if (res.status === 401) clearSessionCookies(out.cookies);
  return out;
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
