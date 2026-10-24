import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { UnauthorizedException } from "../errors";
import { createSession } from "./session";

const SECRET = "test-access";
const access = (sub: string, expiresIn: number) =>
  jwt.sign({ sub, role: "WORKER" }, SECRET, { expiresIn });

const jar = (cookies: Record<string, string>) => ({
  get: (name: string) =>
    name in cookies ? { value: cookies[name] } : undefined,
});

describe("createSession", () => {
  const users = { findById: vi.fn() };
  const auth = { refresh: vi.fn() };
  let session: ReturnType<typeof createSession>;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = SECRET;
  });

  beforeEach(() => {
    vi.resetAllMocks();
    users.findById.mockImplementation(async (id: string) => ({
      id,
      role: "WORKER",
      isActive: true,
    }));
    session = createSession({ auth, users });
  });

  it("reads the user from a valid access cookie without refreshing", async () => {
    const r = await session.resolve(jar({ nonoy_access: access("u1", 600) }));
    expect(r.user).toEqual({ id: "u1", role: "WORKER" });
    expect(auth.refresh).not.toHaveBeenCalled();
  });

  it("takes the role from the database, not the token", async () => {
    users.findById.mockResolvedValue({
      id: "u1",
      role: "ADMIN",
      isActive: true,
    });
    const r = await session.resolve(jar({ nonoy_access: access("u1", 600) }));
    expect(r.user).toEqual({ id: "u1", role: "ADMIN" });
  });

  it("cuts off a deactivated user right away", async () => {
    users.findById.mockResolvedValue({
      id: "u1",
      role: "WORKER",
      isActive: false,
    });
    const r = await session.resolve(jar({ nonoy_access: access("u1", 600) }));
    expect(r.user).toBeNull();
  });

  it("refreshes once on expired access, returning the new tokens", async () => {
    const fresh = { accessToken: access("u1", 600), refreshToken: "r2" };
    auth.refresh.mockResolvedValue(fresh);
    const cookies = jar({
      nonoy_access: access("u1", -10),
      nonoy_refresh: "r1",
    });
    const [a, b] = await Promise.all([
      session.resolve(cookies),
      session.resolve(cookies),
    ]);
    expect(auth.refresh).toHaveBeenCalledOnce();
    expect(auth.refresh).toHaveBeenCalledWith("r1");
    expect(a).toMatchObject({ user: { id: "u1" }, tokens: fresh });
    expect(b.user).toEqual(a.user);
  });

  it("marks a rejected refresh token invalid (log out)", async () => {
    auth.refresh.mockRejectedValue(
      new UnauthorizedException("Invalid refresh token"),
    );
    const r = await session.resolve(jar({ nonoy_refresh: "bad" }));
    expect(r).toMatchObject({ user: null, invalid: true });
  });

  it("keeps the session when the database is down (unavailable, not invalid)", async () => {
    auth.refresh.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const r = await session.resolve(jar({ nonoy_refresh: "r1" }));
    expect(r).toMatchObject({ user: null, unavailable: true });
    expect(r.invalid).toBeUndefined();
  });

  it("is signed out with no cookies at all", async () => {
    expect(await session.resolve(jar({}))).toEqual({ user: null });
  });
});
