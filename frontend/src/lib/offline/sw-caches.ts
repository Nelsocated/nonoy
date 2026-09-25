import { PAGES_CACHE } from "./sw-routes";

// Page caches hold the signed-in user's name etc.; logout clears them.
export async function clearPageCaches() {
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

export async function warmFieldPages() {
  if (typeof caches === "undefined" || !caches) return;
  const cache = await caches.open(PAGES_CACHE);
  await Promise.all(FIELD_PAGES.map((url) => cache.add(url).catch(() => {})));
}
