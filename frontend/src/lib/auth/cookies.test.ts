import { describe, expect, it } from "vitest";
import {
  COOKIE,
  clearSessionCookies,
  parseUser,
  writeSessionCookies,
} from "./cookies";

describe("cookies", () => {
  it("parses a valid user cookie", () => {
    expect(parseUser('{"id":"1","name":"A","role":"ADMIN"}')).toEqual({
      id: "1",
      name: "A",
      role: "ADMIN",
    });
  });
  it("rejects garbage and unknown roles", () => {
    expect(parseUser(undefined)).toBeNull();
    expect(parseUser("{not json")).toBeNull();
    expect(parseUser('{"id":"1","name":"A","role":"GOD"}')).toBeNull();
  });
  it("writes tokens and user, and clears all three", () => {
    const jar = new Map<string, string>();
    const target = {
      set: (n: string, v: string) => void jar.set(n, v),
      delete: (n: string) => void jar.delete(n),
    };
    writeSessionCookies(
      target,
      { accessToken: "a", refreshToken: "r" },
      { id: "1", name: "A", role: "WORKER" },
    );
    expect(jar.get(COOKIE.access)).toBe("a");
    expect(jar.get(COOKIE.refresh)).toBe("r");
    expect(parseUser(jar.get(COOKIE.user))).toEqual({
      id: "1",
      name: "A",
      role: "WORKER",
    });
    clearSessionCookies(target);
    expect(jar.size).toBe(0);
  });
});

describe("writeSessionCookies with a grace-window refresh", () => {
  it("keeps the existing refresh cookie when no new refresh token is given", () => {
    const jar = new Map<string, string>([[COOKIE.refresh, "keep-me"]]);
    const target = {
      set: (n: string, v: string) => void jar.set(n, v),
      delete: (n: string) => void jar.delete(n),
    };
    writeSessionCookies(target, { accessToken: "a", refreshToken: null });
    expect(jar.get(COOKIE.access)).toBe("a");
    expect(jar.get(COOKIE.refresh)).toBe("keep-me");
  });
});

describe("userAfterRefresh", () => {
  const jwt = (payload: object) =>
    `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;
  const admin = { id: "1", name: "A", role: "ADMIN" as const };

  it("returns the user with the new role when the backend changed it", async () => {
    const { userAfterRefresh } = await import("./cookies");
    expect(userAfterRefresh(admin, jwt({ role: "WORKER" }))).toEqual({
      ...admin,
      role: "WORKER",
    });
  });
  it("returns undefined when nothing changed or the token has no usable role", async () => {
    const { userAfterRefresh } = await import("./cookies");
    expect(userAfterRefresh(admin, jwt({ role: "ADMIN" }))).toBeUndefined();
    expect(userAfterRefresh(admin, "garbage")).toBeUndefined();
    expect(userAfterRefresh(null, jwt({ role: "WORKER" }))).toBeUndefined();
  });
});
