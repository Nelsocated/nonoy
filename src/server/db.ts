import "server-only";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { PrismaClient } from "./generated/prisma/client";
import { poolConfig } from "./pool-config";

// Kept on globalThis so there is exactly one pool per instance, even if this
// module is loaded twice (dev hot reloads, or separate bundles in one process).
const g = globalThis as unknown as { db?: PrismaClient };

function createDb() {
  const pool = new Pool(poolConfig(process.env.DATABASE_URL));
  // closes idle connections before Vercel suspends the instance
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const db = (g.db ??= createDb());

export type Db = typeof db;
