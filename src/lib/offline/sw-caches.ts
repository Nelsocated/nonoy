import type { Role } from "@/lib/api/types";
import { INFO_PAGES } from "@/lib/auth/roles";
import { PAGES_CACHE } from "./sw-routes";

// bumped by every clear, so a warm-up still running at logout can tell
let generation = 0;
// last finished warm-up, so moving between /admin and /field doesn't refetch everything
let warmed: { generation: number; role: Role; at: number } | null = null;
const REWARM_AFTER_MS = 5 * 60 * 1000;

// Page caches hold the signed-in user's name etc.; logout clears them.
export async function clearPageCaches() {
  generation++;
  warmed = null;
  if (typeof caches === "undefined") return;
  const keep = (name: string) => name.startsWith("serwist-precache"); // app code, no user data
  await Promise.all(
    (await caches.keys()).filter((n) => !keep(n)).map((n) => caches.delete(n)),
  );
}

// The service worker only keeps pages that were opened online, so a screen
// never visited before (e.g. Recount) would show the offline page instead.
// Opening any one page online saves all of these into the same page cache the
// service worker reads and logout clears.
export const FIELD_PAGES = [
  "/field",
  "/field/sale",
  "/field/sales",
  "/field/sale/receipt",
  "/field/pickup",
  "/field/recount",
  "/field/expense",
  "/field/sync",
  ...INFO_PAGES, // Help mostly, for a worker stuck with no signal
];

// Trip and receipt pages (/admin/trips/<id>…) differ per record, so only the
// ones already opened are kept.
export const ADMIN_PAGES = [
  "/admin",
  "/admin/trips",
  "/admin/reports",
  "/admin/buyers",
  "/admin/plantations",
  "/admin/price",
  "/admin/qr-codes",
  "/admin/users",
];

// owner/admin also go out on trips, so they get the phone screens too
export const pagesFor = (role: Role) =>
  role === "WORKER" ? FIELD_PAGES : [...ADMIN_PAGES, ...FIELD_PAGES];

// Skips redirects (an expired session sends /login, which mustn't be saved as
// a worker screen) and anything that arrives after logout cleared the caches.
export async function warmPages(role: Role) {
  if (typeof caches === "undefined" || !caches) return;
  const started = generation;
  if (
    warmed?.generation === started &&
    warmed.role === role &&
    Date.now() - warmed.at < REWARM_AFTER_MS
  )
    return;
  warmed = { generation: started, role, at: Date.now() };
  await Promise.all(
    pagesFor(role).map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok || res.redirected || generation !== started) return;
        const cache = await caches.open(PAGES_CACHE);
        if (generation === started) await cache.put(url, res);
      } catch {
        // offline or flaky: the page gets cached when it's opened instead
      }
    }),
  );
}
