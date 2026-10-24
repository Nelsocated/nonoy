import {
  createTRPCClient,
  httpLink,
  TRPCClientError,
  type TRPCClient,
} from "@trpc/client";
import type { AnyRouter } from "@trpc/server";
import { ApiError } from "./errors";

// Offline sync sends the id of the user whose queue it is; the server refuses
// it if someone else is signed in now (shared phone, stale tab).
export const OFFLINE_USER_HEADER = "x-offline-user";

type Options = {
  url: string;
  fetch?: typeof fetch;
  onUnauthorized?: () => void;
  offlineUser?: string;
};

// tRPC always rejects with its own error type, so each call is wrapped:
// server errors become ApiError(status, message); a network failure is
// rethrown as-is (the sync engine treats it as "offline").
function toApiError(e: unknown, onUnauthorized?: () => void): unknown {
  if (!(e instanceof TRPCClientError)) return e;
  const status = (e.data as { httpStatus?: unknown } | undefined)?.httpStatus;
  if (typeof status === "number") {
    if (status === 401) onUnauthorized?.();
    return new ApiError(status, e.message);
  }
  if (e.cause instanceof ApiError && e.cause.status === 401) onUnauthorized?.();
  return e.cause ?? e;
}

function wrap(target: unknown, onUnauthorized?: () => void): unknown {
  return new Proxy(target as object, {
    get(obj, key) {
      const value = Reflect.get(obj, key);
      if (key === "query" || key === "mutate")
        return (...args: unknown[]) =>
          (value as (...a: unknown[]) => Promise<unknown>)(...args).catch(
            (e: unknown) => {
              throw toApiError(e, onUnauthorized);
            },
          );
      return typeof key === "string" ? wrap(value, onUnauthorized) : value;
    },
  });
}

// An answer that isn't tRPC JSON (a Vercel error page: timeout, payload too
// large) still becomes ApiError(status), as the old fetch wrapper did.
const keepStatus =
  (fetchImpl: typeof fetch = fetch): typeof fetch =>
  async (input, init) => {
    const res = await fetchImpl(input, init);
    if (!res.ok && !res.headers.get("content-type")?.includes("json"))
      throw new ApiError(res.status, `Request failed (${res.status})`);
    return res;
  };

export function createApiClient<R extends AnyRouter>({
  url,
  fetch: fetchImpl,
  onUnauthorized,
  offlineUser,
}: Options): TRPCClient<R> {
  // built untyped (no transformer either way), typed as R on the way out
  const client = createTRPCClient<AnyRouter>({
    links: [
      httpLink({
        url,
        fetch: keepStatus(fetchImpl),
        headers: () =>
          offlineUser ? { [OFFLINE_USER_HEADER]: offlineUser } : {},
      }),
    ],
  });
  return wrap(client, onUnauthorized) as TRPCClient<R>;
}
