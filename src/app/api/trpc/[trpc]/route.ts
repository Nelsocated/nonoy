import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { OFFLINE_USER_HEADER } from "@/lib/trpc/client";
import { db } from "@/server/db";
import { appRouter } from "@/server/routers/_app";
import { createServices } from "@/server/services";
import type { Ctx } from "@/server/trpc";

// Vercel sets x-forwarded-for itself; the first entry is the real client.
const clientIp = (h: Headers) =>
  h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  h.get("x-real-ip")?.trim() ||
  "unknown";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async (): Promise<Ctx> => ({
      user: null,
      ip: clientIp(req.headers),
      offlineUser: req.headers.get(OFFLINE_USER_HEADER),
      services: createServices(db),
    }),
    onError: ({ error, path }) => {
      if (error.code === "INTERNAL_SERVER_ERROR")
        console.error(`tRPC ${path}:`, error.cause ?? error);
    },
  });
}

export { handler as GET, handler as POST };
