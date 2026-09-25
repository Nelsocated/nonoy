import { afterEach, describe, expect, it, vi } from "vitest";
import { FIELD_PAGES, warmFieldPages } from "./sw-caches";

describe("warmFieldPages", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("saves every worker screen into the page cache so it opens offline the first time", async () => {
    const add = vi.fn<(url: string) => Promise<void>>(async () => {});
    const open = vi.fn(async () => ({ add }));
    vi.stubGlobal("caches", { open });
    await warmFieldPages();
    expect(open).toHaveBeenCalledWith("mangfrito-pages");
    expect(add.mock.calls.map((c) => c[0])).toEqual(FIELD_PAGES);
    expect(FIELD_PAGES).toEqual(
      expect.arrayContaining([
        "/field",
        "/field/sale",
        "/field/pickup",
        "/field/recount",
        "/field/expense",
        "/field/sync",
      ]),
    );
  });

  it("keeps going when one page fails and never throws", async () => {
    const add = vi.fn(async (url: string) => {
      if (url === "/field/sale") throw new Error("network");
    });
    vi.stubGlobal("caches", { open: async () => ({ add }) });
    await expect(warmFieldPages()).resolves.toBeUndefined();
    expect(add).toHaveBeenCalledTimes(6);
  });

  it("does nothing where the Cache API doesn't exist", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(warmFieldPages()).resolves.toBeUndefined();
  });
});
