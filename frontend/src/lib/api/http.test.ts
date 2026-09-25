import { describe, expect, it, vi } from "vitest";
import { ApiError, buildUrl, createHttp, errorMessage } from "./http";

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("buildUrl", () => {
  it("joins base and path and drops undefined query values", () => {
    expect(buildUrl("/api/", "/reports/daily", { from: "2026-09-01", workerId: undefined }))
      .toBe("/api/reports/daily?from=2026-09-01");
  });
  it("omits ? when there is no query", () => {
    expect(buildUrl("http://x:4000", "/trips/me")).toBe("http://x:4000/trips/me");
  });
});

describe("errorMessage", () => {
  it("joins Nest validation message arrays", () => {
    expect(errorMessage({ message: ["a is bad", "b is bad"] }, 400)).toBe("a is bad, b is bad");
  });
  it("falls back to a status message", () => {
    expect(errorMessage(null, 500)).toBe("Request failed (500)");
  });
});

describe("createHttp", () => {
  it("sends JSON bodies with merged headers and parses JSON", async () => {
    const fetch = vi.fn(async () => json(200, { id: "1" }));
    const http = createHttp({ baseUrl: "http://x", headers: () => ({ Authorization: "Bearer t" }), fetch });
    await expect(http.post("/buyers", { name: "A" })).resolves.toEqual({ id: "1" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://x/buyers");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"name":"A"}');
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer t");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });
  it("returns undefined for an empty body", async () => {
    const http = createHttp({ baseUrl: "http://x", fetch: async () => new Response(null, { status: 204 }) });
    await expect(http.delete("/buyers/1")).resolves.toBeUndefined();
  });
  it("throws ApiError with status and Nest message", async () => {
    const http = createHttp({ baseUrl: "http://x", fetch: async () => json(400, { message: "bad kilo" }) });
    await expect(http.get("/x")).rejects.toMatchObject({ name: "ApiError", status: 400, message: "bad kilo" });
  });
  it("calls onUnauthorized on 401 and still throws", async () => {
    const onUnauthorized = vi.fn();
    const http = createHttp({ baseUrl: "http://x", onUnauthorized, fetch: async () => json(401, { message: "Unauthorized" }) });
    await expect(http.get("/x")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
