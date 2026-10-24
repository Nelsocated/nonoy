import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { PrismaClient } from "./generated/prisma/client";

// One small pool per function instance: Vercel runs many instances against a
// Postgres that allows ~100 connections. Kept on globalThis so dev hot reloads
// don't open a new pool each time.
const g = globalThis as unknown as { db?: PrismaClient };

function createDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  // closes idle connections before Vercel suspends the instance
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const db = g.db ?? createDb();
if (process.env.NODE_ENV !== "production") g.db = db;

export type Db = typeof db;
