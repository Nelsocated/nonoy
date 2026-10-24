import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_PAGES,
  clearPageCaches,
  FIELD_PAGES,
  pagesFor,
  warmPages,
} from "./sw-caches";

const page = (over: Partial<Response> = {}) =>
  ({ ok: true, redirected: false, ...over }) as Response;

function stubCaches() {
  const put = vi.fn<(url: string, res: Response) => Promise<void>>(
    async () => {},
  );
  const open = vi.fn(async () => ({ put }));
  vi.stubGlobal("caches", { open, keys: async () => [], delete: vi.fn() });
  return { put, open };
}

describe("warmPages", () => {
  // forget the last warm-up so each test starts cold
  beforeEach(async () => {
    stubCaches();
    await clearPageCaches();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("includes Help and the info pages, so a worker can read them offline", () => {
    expect(FIELD_PAGES).toEqual(
      expect.arrayContaining(["/help", "/about", "/privacy", "/terms"]),
    );
  });

  it("saves every worker screen into the page cache so it opens offline the first time", async () => {
    const { put, open } = stubCaches();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page()),
    );
    await warmPages("WORKER");
    expect(open).toHaveBeenCalledWith("mangfrito-pages");
    expect(put.mock.calls.map((c) => c[0])).toEqual(FIELD_PAGES);
    expect(FIELD_PAGES).toEqual(
      expect.arrayContaining([
        "/field",
        "/field/sale",
        "/field/pickup",
        "/field/recount",
        "/field/expense",
        "/field/sync",
        "/field/sales",
        "/field/sale/receipt",
      ]),
    );
  });

  it("keeps going when one page fails and never throws", async () => {
    const { put } = stubCaches();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/field/sale") throw new Error("network");
        return page();
      }),
    );
    await expect(warmPages("WORKER")).resolves.toBeUndefined();
    expect(put).toHaveBeenCalledTimes(FIELD_PAGES.length - 1);
  });

  // an expired session redirects to /login — that must not be saved as /field
  it("skips redirected and failed responses", async () => {
    const { put } = stubCaches();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/field"
          ? page({ redirected: true })
          : url === "/field/sale"
            ? page({ ok: false })
            : page(),
      ),
    );
    await warmPages("WORKER");
    const saved = put.mock.calls.map((c) => c[0]);
    expect(saved).not.toContain("/field");
    expect(saved).not.toContain("/field/sale");
    expect(saved).toHaveLength(FIELD_PAGES.length - 2);
  });

  // pages hold the worker's name; logout mid-warm must leave the cache empty
  it("saves nothing that arrives after logout cleared the caches", async () => {
    const { put } = stubCaches();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await gate;
        return page();
      }),
    );
    const warming = warmPages("WORKER");
    await clearPageCaches();
    release();
    await warming;
    expect(put).not.toHaveBeenCalled();
  });

  it("gives owner/admin every fixed admin screen plus the phone screens", async () => {
    expect(pagesFor("WORKER")).toEqual(FIELD_PAGES);
    for (const role of ["OWNER", "ADMIN"] as const)
      expect(pagesFor(role)).toEqual([...ADMIN_PAGES, ...FIELD_PAGES]);
    expect(ADMIN_PAGES).toEqual(
      expect.arrayContaining([
        "/admin",
        "/admin/trips",
        "/admin/reports",
        "/admin/buyers",
        "/admin/plantations",
        "/admin/price",
        "/admin/qr-codes",
        "/admin/users",
      ]),
    );
    const { put } = stubCaches();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page()),
    );
    await warmPages("OWNER");
    expect(put.mock.calls.map((c) => c[0])).toEqual(pagesFor("OWNER"));
  });

  // moving between /admin and /field mounts the warmer again
  it("doesn't fetch everything again right after a warm-up, but does after logout", async () => {
    stubCaches();
    const fetch = vi.fn(async () => page());
    vi.stubGlobal("fetch", fetch);
    await warmPages("WORKER");
    await warmPages("WORKER");
    expect(fetch).toHaveBeenCalledTimes(FIELD_PAGES.length);
    await clearPageCaches();
    await warmPages("WORKER");
    expect(fetch).toHaveBeenCalledTimes(FIELD_PAGES.length * 2);
  });

  it("does nothing where the Cache API doesn't exist", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(warmPages("WORKER")).resolves.toBeUndefined();
  });
});
