import { cookies } from "next/headers";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { session } from "@/server/auth";
import { buildContext } from "@/server/context";
import { db } from "@/server/db";
import { appRouter } from "@/server/routers/_app";
import { createServices } from "@/server/services";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () =>
      buildContext(req, await cookies(), session.resolve, createServices(db)),
    onError: ({ error, path }) => {
      if (error.code === "INTERNAL_SERVER_ERROR")
        console.error(`tRPC ${path}:`, error.cause ?? error);
    },
  });
}

export { handler as GET, handler as POST };
