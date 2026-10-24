import type { Db } from "./db";

// Login attempts per client IP per minute. Counted in Postgres because each
// Vercel instance has its own memory.
export const LOGIN_LIMIT = 5;
const WINDOW_MS = 60_000;
const KEEP_MS = 10 * 60_000;

/**
 * Records one attempt; true = over the limit, refuse it. If the counter itself
 * fails, the login goes through: a broken limiter must not lock everyone out.
 */
export async function hitLoginLimit(db: Db, ip: string, now = new Date()) {
  try {
    return await count(db, ip, now);
  } catch (e) {
    console.error("login rate limit unavailable:", e);
    return false;
  }
}

async function count(db: Db, ip: string, now: Date) {
  const windowStart = new Date(
    Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS,
  );
  await db.$executeRaw`DELETE FROM login_attempts WHERE window_start < ${new Date(now.getTime() - KEEP_MS)}`;
  const [row] = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO login_attempts (key, window_start, count)
    VALUES (${`login:${ip}`}, ${windowStart}, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = login_attempts.count + 1
    RETURNING count`;
  return row.count > LOGIN_LIMIT;
}
