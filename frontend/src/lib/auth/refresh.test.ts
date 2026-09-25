import { describe, expect, it, vi } from "vitest";
import { refreshTokens } from "./refresh";

const ok = () => new Response(JSON.stringify({ accessToken: "a2", refreshToken: "r2" }), { status: 200 });

describe("refreshTokens", () => {
  it("shares one request between concurrent callers with the same token", async () => {
    const fetch = vi.fn(async () => ok());
    const [a, b] = await Promise.all([refreshTokens("http://x", "r1", fetch), refreshTokens("http://x", "r1", fetch)]);
    expect(fetch).toHaveBeenCalledOnce();
    expect(a).toEqual({ accessToken: "a2", refreshToken: "r2" });
    expect(b).toEqual(a);
  });
  it("posts the refresh token to /auth/refresh", async () => {
    const fetch = vi.fn(async () => ok());
    await refreshTokens("http://x", "r-post", fetch);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://x/auth/refresh");
    expect(init.body).toBe('{"refreshToken":"r-post"}');
  });
  it("returns null when the backend rejects or is unreachable", async () => {
    expect(await refreshTokens("http://x", "r-bad", async () => new Response("{}", { status: 401 }))).toBeNull();
    expect(await refreshTokens("http://x", "r-down", async () => { throw new Error("ECONNREFUSED"); })).toBeNull();
  });
});
