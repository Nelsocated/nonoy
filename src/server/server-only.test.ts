import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The database client and the auth singletons hold DATABASE_URL and the JWT
// secrets. `import "server-only"` makes Next fail the build if a client
// component ever imports them, instead of shipping them to browsers.
describe("server-only guard", () => {
  it.each(["src/server/db.ts", "src/server/auth/index.ts"])("%s", (file) => {
    expect(readFileSync(file, "utf8")).toMatch(/^import "server-only";$/m);
  });
});
