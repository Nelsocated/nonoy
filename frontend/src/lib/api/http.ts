// One fetch wrapper for every API call — server (direct to Nest) and browser (via /api).

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type Query = Record<string, string | number | boolean | undefined>;

export interface Http {
  get<T>(path: string, query?: Query): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

type HttpOptions = {
  baseUrl: string;
  headers?: () => HeadersInit | Promise<HeadersInit>;
  onUnauthorized?: () => void;
  fetch?: typeof fetch;
};

export function buildUrl(base: string, path: string, query?: Query) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) params.set(k, String(v));
  const qs = params.toString();
  return `${base.replace(/\/$/, "")}${path}${qs ? `?${qs}` : ""}`;
}

// Nest errors look like { statusCode, message: string | string[], error }
export function errorMessage(body: unknown, status: number) {
  const message = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string" && message) return message;
  return `Request failed (${status})`;
}

// error pages from proxies (502 HTML) must still become an ApiError with the status
function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

export function createHttp({ baseUrl, headers, onUnauthorized, fetch: fetchImpl = fetch }: HttpOptions): Http {
  async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    const h = new Headers(await headers?.());
    h.set("Accept", "application/json");
    if (body !== undefined) h.set("Content-Type", "application/json");

    const res = await fetchImpl(buildUrl(baseUrl, path, query), {
      method,
      headers: h,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });

    const data = parseJson(await res.text());
    if (!res.ok) {
      if (res.status === 401) onUnauthorized?.();
      throw new ApiError(res.status, errorMessage(data, res.status));
    }
    return data as T;
  }

  return {
    get: (path, query) => request("GET", path, undefined, query),
    post: (path, body) => request("POST", path, body),
    patch: (path, body) => request("PATCH", path, body),
    delete: (path) => request("DELETE", path),
  };
}
