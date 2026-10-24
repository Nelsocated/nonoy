import jwt from "jsonwebtoken";
import { COOKIE } from "@/lib/auth/cookies";
import type { Role } from "../generated/prisma/enums";
import { AppError } from "../errors";
import type { CtxUser } from "../trpc";
import type { AuthService } from "./auth-service";

export type RefreshedTokens = {
  accessToken: string;
  refreshToken: string | null;
};

// "invalid" = the refresh token was rejected (log out); "unavailable" = the
// database failed, so the token may still be fine: keep the session.
export type RefreshResult =
  | { status: "ok"; tokens: RefreshedTokens }
  | { status: "invalid" }
  | { status: "unavailable" };

export type Resolved = {
  user: CtxUser | null;
  /** new tokens to write back as cookies */
  tokens?: RefreshedTokens;
  invalid?: true;
  unavailable?: true;
};

type Jar = { get(name: string): { value: string } | undefined };

type Deps = {
  auth: Pick<AuthService, "refresh">;
  users: {
    findById(
      id: string,
    ): Promise<{ id: string; role: Role; isActive: boolean } | null>;
  };
};

function verifyAccess(token: string | undefined) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { sub: string };
  } catch {
    return null;
  }
}

// The refresh token rotates, so callers holding the same token share one
// refresh, kept briefly for requests already in flight with the old cookie.
// (Across instances, the auth service's 10s grace window covers the race.)
const KEEP_MS = 10_000;

export function createSession({ auth, users }: Deps) {
  const inflight = new Map<string, Promise<RefreshResult>>();

  function refresh(refreshToken: string) {
    let pending = inflight.get(refreshToken);
    if (!pending) {
      pending = (async (): Promise<RefreshResult> => {
        try {
          return { status: "ok", tokens: await auth.refresh(refreshToken) };
        } catch (e) {
          return e instanceof AppError && e.code === "UNAUTHORIZED"
            ? { status: "invalid" }
            : { status: "unavailable" };
        } finally {
          setTimeout(() => inflight.delete(refreshToken), KEEP_MS).unref?.();
        }
      })();
      inflight.set(refreshToken, pending);
    }
    return pending;
  }

  // One primary-key lookup per request, so a deactivated user is cut off
  // immediately and a role change applies right away.
  async function currentUser(sub: string): Promise<CtxUser | null> {
    const user = await users.findById(sub);
    return user?.isActive ? { id: user.id, role: user.role } : null;
  }

  // The user lookup can fail (database blip): answer "unavailable" rather
  // than crash, and still hand back tokens a refresh has already rotated.
  async function lookup(sub: string, tokens?: RefreshedTokens) {
    try {
      return { user: await currentUser(sub), ...(tokens && { tokens }) };
    } catch {
      return {
        user: null,
        unavailable: true as const,
        ...(tokens && { tokens }),
      };
    }
  }

  async function resolve(jar: Jar): Promise<Resolved> {
    const payload = verifyAccess(jar.get(COOKIE.access)?.value);
    if (payload) return lookup(payload.sub);

    const refreshToken = jar.get(COOKIE.refresh)?.value;
    if (!refreshToken) return { user: null };

    const r = await refresh(refreshToken);
    if (r.status === "invalid") return { user: null, invalid: true };
    if (r.status === "unavailable") return { user: null, unavailable: true };
    const fresh = verifyAccess(r.tokens.accessToken);
    if (!fresh) return { user: null, tokens: r.tokens };
    return lookup(fresh.sub, r.tokens);
  }

  return { refresh, resolve };
}
