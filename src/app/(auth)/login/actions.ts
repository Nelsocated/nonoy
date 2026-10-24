"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { homeFor } from "@/lib/auth/roles";
import { clearSession, setSession } from "@/lib/auth/session";
import { authService, session } from "@/server/auth";
import { clientIp } from "@/server/client-ip";
import { db } from "@/server/db";
import { hitLoginLimit } from "@/server/rate-limit";

export type LoginState = { error?: string } | undefined;

export async function login(
  _prev: LoginState,
  form: FormData,
): Promise<LoginState> {
  const phone = String(form.get("phone") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!phone || !password)
    return { error: "Enter your phone number and password." };

  if (await hitLoginLimit(db, clientIp(await headers())))
    return { error: "Too many attempts. Wait a minute and try again." };

  let res: Awaited<ReturnType<typeof authService.login>>;
  try {
    const user = await authService.validateUser({ phone, password });
    if (!user) return { error: "Wrong phone number or password." };
    res = await authService.login(user);
  } catch {
    return {
      error: "Can't reach the server. Check your connection and try again.",
    };
  }

  await setSession(res, res.user);
  redirect(homeFor(res.user.role));
}

export async function logout() {
  // revoke the refresh token server-side; sign out locally even if this fails
  try {
    const { user } = await session.resolve(await cookies());
    if (user) await authService.logout(user.id);
  } catch {}
  await clearSession();
  redirect("/login");
}
