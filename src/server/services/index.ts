import type { Db } from "../db";
import { UsersService } from "./users";

// Every service, wired once per request context (they're stateless).
export function createServices(db: Db) {
  const users = new UsersService(db);
  return { users };
}

export type Services = ReturnType<typeof createServices>;
