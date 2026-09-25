import { describe, expect, it } from "vitest";
import { COOKIE, clearSessionCookies, parseUser, writeSessionCookies } from "./cookies";

describe("cookies", () => {
  it("parses a valid user cookie", () => {
    expect(parseUser('{"id":"1","name":"A","role":"ADMIN"}')).toEqual({ id: "1", name: "A", role: "ADMIN" });
  });
  it("rejects garbage and unknown roles", () => {
    expect(parseUser(undefined)).toBeNull();
    expect(parseUser("{not json")).toBeNull();
    expect(parseUser('{"id":"1","name":"A","role":"GOD"}')).toBeNull();
  });
  it("writes tokens and user, and clears all three", () => {
    const jar = new Map<string, string>();
    const target = { set: (n: string, v: string) => void jar.set(n, v), delete: (n: string) => void jar.delete(n) };
    writeSessionCookies(target, { accessToken: "a", refreshToken: "r" }, { id: "1", name: "A", role: "WORKER" });
    expect(jar.get(COOKIE.access)).toBe("a");
    expect(jar.get(COOKIE.refresh)).toBe("r");
    expect(parseUser(jar.get(COOKIE.user))).toEqual({ id: "1", name: "A", role: "WORKER" });
    clearSessionCookies(target);
    expect(jar.size).toBe(0);
  });
});
