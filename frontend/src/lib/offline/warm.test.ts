import { afterEach, describe, expect, it, vi } from "vitest";
import { clearPageCaches, FIELD_PAGES, warmFieldPages } from "./sw-caches";

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

describe("warmFieldPages", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("saves every worker screen into the page cache so it opens offline the first time", async () => {
    const { put, open } = stubCaches();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page()),
    );
    await warmFieldPages();
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
    await expect(warmFieldPages()).resolves.toBeUndefined();
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
    await warmFieldPages();
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
    const warming = warmFieldPages();
    await clearPageCaches();
    release();
    await warming;
    expect(put).not.toHaveBeenCalled();
  });

  it("does nothing where the Cache API doesn't exist", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(warmFieldPages()).resolves.toBeUndefined();
  });
});
