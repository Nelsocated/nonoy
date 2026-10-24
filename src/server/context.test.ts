import { describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { buildContext } from "./context";
import type { Resolved } from "./auth/session";

// a cookie jar like next/headers cookies(): reads what the browser sent,
// records what the response will set or delete
function jar(sent: Record<string, string> = {}) {
  return {
    get: (name: string) => (name in sent ? { value: sent[name] } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  };
}
const request = (headers: Record<string, string> = {}) =>
  new Request("http://test/api/trpc/x", { headers });
const resolving = (r: Resolved) => async () => r;
const services = {} as never;

const access = (role: string) =>
  jwt.sign({ sub: "u1", role }, "any-secret", { expiresIn: 600 });

describe("buildContext", () => {
  it("writes refreshed tokens onto the response", async () => {
    const cookies = jar({ nonoy_refresh: "r1" });
    const tokens = { accessToken: access("WORKER"), refreshToken: "r2" };
    const ctx = await buildContext(
      request(),
      cookies,
      resolving({ user: { id: "u1", role: "WORKER" }, tokens }),
      services,
    );
    expect(ctx.user).toEqual({ id: "u1", role: "WORKER" });
    expect(cookies.set).toHaveBeenCalledWith(
      "nonoy_access",
      tokens.accessToken,
      expect.anything(),
    );
    expect(cookies.set).toHaveBeenCalledWith(
      "nonoy_refresh",
      "r2",
      expect.anything(),
    );
  });

  it("updates the user cookie when the refreshed role changed", async () => {
    const cookies = jar({
      nonoy_refresh: "r1",
      nonoy_user: JSON.stringify({ id: "u1", name: "Ana", role: "WORKER" }),
    });
    const tokens = { accessToken: access("ADMIN"), refreshToken: null };
    await buildContext(
      request(),
      cookies,
      resolving({ user: { id: "u1", role: "ADMIN" }, tokens }),
      services,
    );
    expect(cookies.set).toHaveBeenCalledWith(
      "nonoy_user",
      JSON.stringify({ id: "u1", name: "Ana", role: "ADMIN" }),
      expect.anything(),
    );
    // inside the grace window there's no new refresh token to write
    expect(cookies.set).not.toHaveBeenCalledWith(
      "nonoy_refresh",
      expect.anything(),
      expect.anything(),
    );
  });

  it("clears the cookies when the refresh token was rejected", async () => {
    const cookies = jar({ nonoy_refresh: "dead" });
    const ctx = await buildContext(
      request(),
      cookies,
      resolving({ user: null, invalid: true }),
      services,
    );
    expect(ctx.user).toBeNull();
    expect(cookies.delete).toHaveBeenCalledWith("nonoy_refresh");
  });

  it("keeps the cookies when the database was unavailable", async () => {
    const cookies = jar({ nonoy_refresh: "r1" });
    const ctx = await buildContext(
      request(),
      cookies,
      resolving({ user: null, unavailable: true }),
      services,
    );
    expect(ctx.sessionUnavailable).toBe(true);
    expect(cookies.delete).not.toHaveBeenCalled();
  });

  it("passes on whose offline queue it is, and keeps the signed-in user's cookies", async () => {
    const cookies = jar({ nonoy_access: "a" });
    const ctx = await buildContext(
      request({ "x-offline-user": "someone-else" }),
      cookies,
      resolving({ user: { id: "u1", role: "WORKER" } }),
      services,
    );
    expect(ctx.offlineUser).toBe("someone-else");
    expect(cookies.delete).not.toHaveBeenCalled();
  });

  it("takes the client IP from Vercel's x-forwarded-for", async () => {
    const ctx = await buildContext(
      request({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
      jar(),
      resolving({ user: null }),
      services,
    );
    expect(ctx.ip).toBe("203.0.113.7");
  });
});
