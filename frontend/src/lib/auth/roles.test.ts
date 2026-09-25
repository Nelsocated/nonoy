import { describe, expect, it } from "vitest";
import { canAccess, guard, homeFor, isPublic } from "./roles";
import type { SessionUser } from "@/lib/api/types";

const owner: SessionUser = { id: "1", name: "O", role: "OWNER" };
const worker: SessionUser = { id: "2", name: "W", role: "WORKER" };

describe("roles", () => {
  it("maps roles to homes", () => {
    expect(homeFor("OWNER")).toBe("/admin");
    expect(homeFor("ADMIN")).toBe("/admin");
    expect(homeFor("WORKER")).toBe("/field");
  });
  it("matches areas by whole segment, not prefix", () => {
    expect(canAccess("WORKER", "/field/trips")).toBe(true);
    expect(canAccess("WORKER", "/admin")).toBe(false);
    // owner/admin sometimes go out with the staff and record trips themselves
    expect(canAccess("OWNER", "/field")).toBe(true);
    expect(canAccess("ADMIN", "/field/sale")).toBe(true);
    expect(canAccess("WORKER", "/administrator")).toBe(true); // not the /admin area
    expect(canAccess("OWNER", "/fieldwork")).toBe(true); // not the /field area
  });
  it("knows public pages", () => {
    expect(isPublic("/login")).toBe(true);
    expect(isPublic("/theme")).toBe(true);
    expect(isPublic("/~offline")).toBe(true);
    expect(isPublic("/admin")).toBe(false);
  });
});

describe("guard", () => {
  const g = (pathname: string, user: SessionUser | null, expired = false) =>
    guard({ pathname, user, expired });

  it("sends signed-out users to /login", () => {
    expect(g("/admin", null)).toEqual({ action: "redirect", to: "/login" });
    expect(g("/", null)).toEqual({ action: "redirect", to: "/login" });
  });
  it("lets anyone see public pages", () => {
    expect(g("/theme", null)).toEqual({ action: "next" });
    expect(g("/login", null)).toEqual({ action: "next" });
  });
  it("bounces signed-in users off /login to their home", () => {
    expect(g("/login", owner)).toEqual({ action: "redirect", to: "/admin" });
  });
  it("clears the session on /login?expired instead of bouncing (no redirect loop)", () => {
    expect(g("/login", owner, true)).toEqual({ action: "clear" });
  });
  it("sends users to their own area", () => {
    expect(g("/admin/reports", worker)).toEqual({
      action: "redirect",
      to: "/field",
    });
    expect(g("/field", owner)).toEqual({ action: "next" });
    expect(g("/", worker)).toEqual({ action: "redirect", to: "/field" });
    expect(g("/admin", owner)).toEqual({ action: "next" });
  });
});
