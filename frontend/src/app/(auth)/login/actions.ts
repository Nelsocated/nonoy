"use server";

import { redirect } from "next/navigation";
import { ApiError, type LoginResponse } from "@/lib/api";
import { forwardingHeaders, publicApi } from "@/lib/api/server";
import { API_URL } from "@/lib/env";
import { homeFor } from "@/lib/auth/roles";
import { clearSession, getSession, setSession } from "@/lib/auth/session";

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const phone = String(form.get("phone") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!phone || !password) return { error: "Enter your phone number and password." };

  let res: LoginResponse;
  try {
    res = await publicApi.auth.login({ phone, password });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return { error: "Wrong phone number or password." };
    if (e instanceof ApiError && e.status === 429) return { error: "Too many attempts. Wait a minute and try again." };
    if (e instanceof ApiError && e.status === 400) return { error: e.message };
    return { error: "Can't reach the server. Check your connection and try again." };
  }

  await setSession(res, res.user);
  redirect(homeFor(res.user.role));
}

export async function logout() {
  const session = await getSession();
  // revoke the refresh token server-side; sign out locally even if this fails
  if (session?.accessToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { ...(await forwardingHeaders()), Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    }).catch(() => {});
  }
  await clearSession();
  redirect("/login");
}
