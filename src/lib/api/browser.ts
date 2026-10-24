"use client";

// For client components: calls go to our own /api/*, which adds the token server-side.
import { createApi } from ".";
import { createHttp } from "./http";

export const api = createApi(
  createHttp({
    baseUrl: "/api",
    // the /api forwarder already tried a refresh — the session is really over.
    // A full load (not router.push) so proxy.ts runs and clears the dead cookies.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    onUnauthorized: () => window.location.assign("/login?expired=1"),
  }),
);
