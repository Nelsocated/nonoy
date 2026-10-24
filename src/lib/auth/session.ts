// Server components, server actions and route handlers only (next/headers).
import { cookies } from "next/headers";
import type { SessionUser, Tokens } from "@/lib/api/types";
import {
  COOKIE,
  clearSessionCookies,
  parseUser,
  writeSessionCookies,
} from "./cookies";

export async function getSession() {
  const jar = await cookies();
  const user = parseUser(jar.get(COOKIE.user)?.value);
  const refreshToken = jar.get(COOKIE.refresh)?.value;
  if (!user || !refreshToken) return null;
  return { user, refreshToken, accessToken: jar.get(COOKIE.access)?.value };
}

export async function setSession(tokens: Tokens, user: SessionUser) {
  writeSessionCookies(await cookies(), tokens, user);
}

export async function clearSession() {
  clearSessionCookies(await cookies());
}
