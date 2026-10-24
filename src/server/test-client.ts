// Test helper: a real tRPC client whose fetch goes straight into the handler,
// so tests see exactly what the browser sees (status, message, ApiError).
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { AnyRouter } from "@trpc/server";
import { createApiClient } from "@/lib/trpc/client";
import type { Ctx } from "./trpc";

export function testClient<R extends AnyRouter>(
  router: R,
  ctx: Partial<Ctx> = {},
) {
  const fetchImpl: typeof fetch = (input, init) =>
    fetchRequestHandler({
      endpoint: "/api/trpc",
      req: new Request(input as string, init),
      router,
      createContext: () =>
        ({
          user: null,
          ip: "1.2.3.4",
          offlineUser: null,
          services: {},
          ...ctx,
        }) as Ctx,
      onError: () => {},
    });
  return createApiClient<R>({ url: "http://test/api/trpc", fetch: fetchImpl });
}
