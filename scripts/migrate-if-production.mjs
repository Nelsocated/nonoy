// Vercel builds every branch against the shared database: only production
// deploys may change its schema.
import { spawnSync } from "node:child_process";

const env = process.env.VERCEL_ENV;
if (env === "production") {
  const r = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: true,
  });
  process.exit(r.status ?? 1);
} else {
  console.log(`skip migrate (${env ?? "local"})`);
}
