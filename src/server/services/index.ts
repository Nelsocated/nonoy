import type { Db } from "../db";

// Every service, wired once per request context (they're stateless).
export function createServices(db: Db) {
  void db;
  return {};
}

export type Services = ReturnType<typeof createServices>;
