import { describe, expect, it, vi } from "vitest";
import type { Http } from "../http";
import { buyers } from "./buyers";
import { plantations } from "./plantations";
import { reports } from "./reports";
import { users } from "./users";

const fakeHttp = () => ({
  get: vi.fn(async () => []),
  post: vi.fn(),
  patch: vi.fn(async () => ({})),
  delete: vi.fn(async () => ({ result: "deleted", uses: 0 })),
});
const asHttp = (h: ReturnType<typeof fakeHttp>) => h as unknown as Http;

describe("reference data endpoints", () => {
  it("lists active only unless archived is asked for", async () => {
    const http = fakeHttp();
    await buyers(asHttp(http)).list();
    expect(http.get).toHaveBeenLastCalledWith("/buyers", undefined);
    await plantations(asHttp(http)).list({ archived: true });
    expect(http.get).toHaveBeenLastCalledWith("/plantations", {
      include: "archived",
    });
  });
  it("restores via PATCH /:id/restore", async () => {
    const http = fakeHttp();
    await buyers(asHttp(http)).restore("b1");
    expect(http.patch).toHaveBeenCalledWith("/buyers/b1/restore");
    await plantations(asHttp(http)).restore("p1");
    expect(http.patch).toHaveBeenLastCalledWith("/plantations/p1/restore");
  });
});

describe("users endpoints", () => {
  it("edits and resets passwords", async () => {
    const http = fakeHttp();
    await users(asHttp(http)).update("u1", { name: "A" });
    expect(http.patch).toHaveBeenCalledWith("/users/u1", { name: "A" });
    await users(asHttp(http)).resetPassword("u1", "secret1");
    expect(http.patch).toHaveBeenLastCalledWith("/users/u1/password", {
      password: "secret1",
    });
  });
});

describe("dashboard endpoints", () => {
  it("pages problems and checks them", async () => {
    const http = fakeHttp();
    await reports(asHttp(http)).problems(2);
    expect(http.get).toHaveBeenLastCalledWith("/reports/problems", { page: 2 });
    await reports(asHttp(http)).check("sale", "s1", "ok");
    expect(http.patch).toHaveBeenLastCalledWith(
      "/reports/problems/sale/s1/check",
      { note: "ok" },
    );
    await reports(asHttp(http)).openTrips();
    expect(http.get).toHaveBeenLastCalledWith("/reports/open-trips");
  });
});
