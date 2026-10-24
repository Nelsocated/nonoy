/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";
import {
  PAGES_CACHE,
  pageCacheKey,
  PAGES_MAX_AGE_SECONDS,
  isAppNavigation,
} from "@/lib/offline/sw-routes";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // data goes through the sync engine only — never serve API responses from cache
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    // app pages: fresh when online (5s max on weak signal), otherwise the last
    // copy — kept 30 days since last use so the app still opens offline
    {
      matcher: isAppNavigation,
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE,
        networkTimeoutSeconds: 5,
        plugins: [
          { cacheKeyWillBeUsed: ({ request }) => pageCacheKey(request) },
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: PAGES_MAX_AGE_SECONDS,
            maxAgeFrom: "last-used",
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
