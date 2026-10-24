import { beforeEach, describe, expect, it, vi } from "vitest";
import { hitLoginLimit, LOGIN_LIMIT } from "./rate-limit";

const sql = (call: unknown[]) =>
  (call[0] as TemplateStringsArray).join("?").replace(/\s+/g, " ");

describe("hitLoginLimit", () => {
  const db = { $queryRaw: vi.fn(), $executeRaw: vi.fn() };
  const now = new Date("2026-10-24T08:15:42.500Z");

  beforeEach(() => {
    vi.resetAllMocks();
    db.$executeRaw.mockResolvedValue(0);
  });

  it("allows 5 attempts a minute", async () => {
    expect(LOGIN_LIMIT).toBe(5);
    db.$queryRaw.mockResolvedValue([{ count: 5 }]);
    expect(await hitLoginLimit(db as never, "1.2.3.4", now)).toBe(false);
  });

  it("blocks the 6th", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 6 }]);
    expect(await hitLoginLimit(db as never, "1.2.3.4", now)).toBe(true);
  });

  it("counts per IP in a window floored to the minute", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 1 }]);
    await hitLoginLimit(db as never, "1.2.3.4", now);
    const call = db.$queryRaw.mock.calls[0];
    expect(sql(call)).toContain("ON CONFLICT (key, window_start)");
    expect(call).toContain("login:1.2.3.4");
    expect(call).toContainEqual(new Date("2026-10-24T08:15:00.000Z"));
  });

  it("deletes windows older than 10 minutes on every call", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 1 }]);
    await hitLoginLimit(db as never, "1.2.3.4", now);
    const call = db.$executeRaw.mock.calls[0];
    expect(sql(call)).toContain("DELETE FROM login_attempts");
    expect(call).toContainEqual(new Date("2026-10-24T08:05:42.500Z"));
  });

  it("lets the login through if the counter itself fails", async () => {
    db.$queryRaw.mockRejectedValue(
      new Error('relation "login_attempts" does not exist'),
    );
    expect(await hitLoginLimit(db as never, "1.2.3.4", now)).toBe(false);
  });
});
