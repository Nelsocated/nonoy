import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { API_URL, INTERNAL_PROXY_SECRET } from "@/lib/env";
import {
  OFFLINE_USER_HEADER,
  backendHeaders,
  isForwardable,
  offlineUserMismatch,
  targetUrl,
} from "@/lib/api/forward";
import {
  COOKIE,
  clearSessionCookies,
  parseUser,
  userAfterRefresh,
  writeSessionCookies,
} from "@/lib/auth/cookies";
import { refreshTokens, type RefreshResult } from "@/lib/auth/refresh";

type Ctx = { params: Promise<{ path: string[] }> };

const unavailable = () =>
  NextResponse.json(
    { statusCode: 502, message: "Can't reach the server right now." },
    { status: 502 },
  );

// Browser → /api/<path> → Nest /<path>, with the access token from the cookie.
// On 401 it refreshes once and retries, saving the rotated tokens.
async function forward(request: NextRequest, { params }: Ctx) {
  const { path } = await params;
  if (!isForwardable(path))
    return NextResponse.json(
      { statusCode: 404, message: "Not found" },
      { status: 404 },
    );

  const jar = await cookies();
  const refresh = jar.get(COOKIE.refresh)?.value;
  if (!refresh)
    return NextResponse.json(
      { statusCode: 401, message: "Not signed in" },
      { status: 401 },
    );
  // offline queue of a different user than the one signed in: don't forward
  // (and don't clear this user's cookies) — the sync engine just pauses
  if (
    offlineUserMismatch(
      request.headers.get(OFFLINE_USER_HEADER),
      parseUser(jar.get(COOKIE.user)?.value),
    )
  )
    return NextResponse.json(
      { statusCode: 401, message: "Signed in as a different user" },
      { status: 401 },
    );

  const method = request.method;
  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.text();
  const url = targetUrl(API_URL, path, request.nextUrl.search);
  const forwarding = backendHeaders(request.headers, INTERNAL_PROXY_SECRET);
  const send = (token?: string) =>
    fetch(url, {
      method,
      body: body || undefined,
      cache: "no-store",
      headers: {
        ...forwarding,
        Accept: "application/json",
        ...(body
          ? {
              "Content-Type":
                request.headers.get("content-type") ?? "application/json",
            }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res: Response;
  let refreshed: RefreshResult | null = null;
  try {
    res = await send(jar.get(COOKIE.access)?.value);
    if (res.status === 401) {
      refreshed = await refreshTokens(API_URL, refresh, forwarding);
      if (refreshed.status === "ok")
        res = await send(refreshed.tokens.accessToken);
    }
  } catch {
    return unavailable();
  }
  // couldn't refresh because the backend is down/throttling: don't log the user out
  if (refreshed?.status === "unavailable") return unavailable();

  const out = new NextResponse(
    res.status === 204 ? null : await res.arrayBuffer(),
    {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
      },
    },
  );
  if (refreshed?.status === "ok") {
    const user = parseUser(jar.get(COOKIE.user)?.value);
    writeSessionCookies(
      out.cookies,
      refreshed.tokens,
      userAfterRefresh(user, refreshed.tokens.accessToken),
    );
  } else if (refreshed?.status === "invalid") {
    clearSessionCookies(out.cookies);
  }
  return out;
}

export {
  forward as GET,
  forward as POST,
  forward as PATCH,
  forward as PUT,
  forward as DELETE,
};
