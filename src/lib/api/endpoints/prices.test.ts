import { describe, expect, it } from "vitest";
import type { Http } from "../http";
import { prices } from "./prices";

describe("prices.current", () => {
  it("is null (not undefined) when the owner hasn't set a price — Nest sends an empty body", async () => {
    const http = { get: async () => undefined } as unknown as Http;
    await expect(prices(http).current()).resolves.toBeNull();
  });
});
