import { PAGES_CACHE } from "./sw-routes";

// bumped by every clear, so a warm-up still running at logout can tell
let generation = 0;

// Page caches hold the signed-in user's name etc.; logout clears them.
export async function clearPageCaches() {
  generation++;
  if (typeof caches === "undefined") return;
  const keep = (name: string) => name.startsWith("serwist-precache"); // app code, no user data
  await Promise.all(
    (await caches.keys()).filter((n) => !keep(n)).map((n) => caches.delete(n)),
  );
}

// Worker screens a first offline trip may need. The service worker only keeps
// pages that were opened online, so a screen never visited before (e.g. Recount)
// would show the offline page instead. Warmed into the same page cache the
// service worker reads and logout clears.
export const FIELD_PAGES = [
  "/field",
  "/field/sale",
  "/field/pickup",
  "/field/recount",
  "/field/expense",
  "/field/sync",
];

// Skips redirects (an expired session sends /login, which mustn't be saved as
// a worker screen) and anything that arrives after logout cleared the caches.
export async function warmFieldPages() {
  if (typeof caches === "undefined" || !caches) return;
  const started = generation;
  await Promise.all(
    FIELD_PAGES.map(async (url) => {
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
