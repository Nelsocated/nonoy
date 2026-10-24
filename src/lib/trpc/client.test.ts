import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import { createApiClient } from "./client";

const trpcError = (status: number, message: string) =>
  new Response(
    JSON.stringify({
      error: {
        message,
        code: -32600,
        data: { code: "TOO_MANY_REQUESTS", httpStatus: status },
      },
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );

describe("createApiClient", () => {
  it("turns a server error into ApiError(status, message)", async () => {
    const client = createApiClient<never>({
      url: "http://test/api/trpc",
      fetch: async () => trpcError(429, "Slow down"),
    }) as unknown as { x: { query(): Promise<unknown> } };
    const e = await client.x.query().catch((err: unknown) => err);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 429, message: "Slow down" });
  });

  it("calls onUnauthorized on a 401", async () => {
    const onUnauthorized = vi.fn();
    const client = createApiClient<never>({
      url: "http://test/api/trpc",
      fetch: async () => trpcError(401, "Not signed in"),
      onUnauthorized,
    }) as unknown as { x: { query(): Promise<unknown> } };
    await client.x.query().catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  // Vercel's own error pages (timeouts, payload too large) aren't tRPC JSON
  it("turns a non-JSON error page into ApiError(status)", async () => {
    const client = createApiClient<never>({
      url: "http://test/api/trpc",
      fetch: async () =>
        new Response("<html>An error occurred</html>", {
          status: 504,
          headers: { "Content-Type": "text/html" },
        }),
    }) as unknown as { x: { query(): Promise<unknown> } };
    const e = await client.x.query().catch((err: unknown) => err);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 504, message: "Request failed (504)" });
  });

  it("leaves network failures alone so sync treats them as offline", async () => {
    const client = createApiClient<never>({
      url: "http://test/api/trpc",
      fetch: async () => {
        throw new TypeError("Failed to fetch");
      },
    }) as unknown as { x: { query(): Promise<unknown> } };
    const e = await client.x.query().catch((err: unknown) => err);
    expect(e).not.toBeInstanceOf(ApiError);
  });

  it("sends the offline user header when given", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ result: { data: "ok" } }), {
          headers: { "Content-Type": "application/json" },
        }),
    );
    const client = createApiClient<never>({
      url: "http://test/api/trpc",
      fetch: fetchImpl as unknown as typeof fetch,
      offlineUser: "w1",
    }) as unknown as { x: { query(): Promise<unknown> } };
    await client.x.query();
    const init = (
      fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    )[1];
    expect(new Headers(init.headers).get("x-offline-user")).toBe("w1");
  });
});
