import { describe, expect, it, vi } from "vitest";
import { refreshTokens } from "./refresh";

const res = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });
const ok = () => res(200, { accessToken: "a2", refreshToken: "r2" });

describe("refreshTokens", () => {
  it("shares one request between concurrent callers with the same token", async () => {
    const fetch = vi.fn(async () => ok());
    const [a, b] = await Promise.all([refreshTokens("http://x", "r1", {}, fetch), refreshTokens("http://x", "r1", {}, fetch)]);
    expect(fetch).toHaveBeenCalledOnce();
    expect(a).toEqual({ status: "ok", tokens: { accessToken: "a2", refreshToken: "r2" } });
    expect(b).toEqual(a);
  });
  it("posts the refresh token with the forwarding headers", async () => {
    const fetch = vi.fn(async () => ok());
    await refreshTokens("http://x", "r-post", { "X-Forwarded-For": "1.2.3.4" }, fetch);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://x/auth/refresh");
    expect(init.body).toBe('{"refreshToken":"r-post"}');
    expect(new Headers(init.headers).get("X-Forwarded-For")).toBe("1.2.3.4");
  });
  it("passes through a grace-window answer with no new refresh token", async () => {
    const r = await refreshTokens("http://x", "r-grace", {}, async () => res(201, { accessToken: "a3", refreshToken: null }));
    expect(r).toEqual({ status: "ok", tokens: { accessToken: "a3", refreshToken: null } });
  });
  it("is 'invalid' only when the backend rejects the token", async () => {
    expect(await refreshTokens("http://x", "r-401", {}, async () => res(401))).toEqual({ status: "invalid" });
    expect(await refreshTokens("http://x", "r-400", {}, async () => res(400))).toEqual({ status: "invalid" });
  });
  it("is 'unavailable' when the backend is down, erroring or throttling (keep the session)", async () => {
    expect(await refreshTokens("http://x", "r-500", {}, async () => res(500))).toEqual({ status: "unavailable" });
    expect(await refreshTokens("http://x", "r-429", {}, async () => res(429))).toEqual({ status: "unavailable" });
    expect(await refreshTokens("http://x", "r-down", {}, async () => { throw new Error("ECONNREFUSED"); })).toEqual({ status: "unavailable" });
  });
});
