import type { PoolConfig } from "pg";

// One small pool per function instance: Vercel runs many instances against a
// Postgres that allows ~100 connections. An unreachable database fails a
// request after 10 s instead of waiting on the OS TCP timeout.
export const poolConfig = (connectionString: string | undefined) =>
  ({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 10_000,
  }) satisfies PoolConfig;
