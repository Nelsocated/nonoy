"use client";

import type { AppRouter } from "@/server/routers/_app";
import { createApiClient } from "./client";

// For screens. A 401 means the server already tried a refresh: the session is
// really over. A full load (not router.push) so proxy.ts clears the cookies.
export const trpc = createApiClient<AppRouter>({
  url: "/api/trpc",
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  onUnauthorized: () => window.location.assign("/login?expired=1"),
});

// For the offline sync engine: no redirect on 401 (sync pauses and the queue
// is kept), and the server refuses the queue if someone else is signed in.
export const createSyncClient = (userId: string) =>
  createApiClient<AppRouter>({ url: "/api/trpc", offlineUser: userId });
