// Page caches hold the signed-in user's name etc.; logout clears them.
export async function clearPageCaches() {
  if (typeof caches === "undefined") return;
  const keep = (name: string) => name.startsWith("serwist-precache"); // app code, no user data
  await Promise.all(
    (await caches.keys()).filter((n) => !keep(n)).map((n) => caches.delete(n)),
  );
}
