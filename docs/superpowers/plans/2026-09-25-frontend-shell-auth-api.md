# Frontend Shell, Auth & API Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Role-split Next.js 16 frontend (OWNER/ADMIN → `/admin`, WORKER → `/field`) with cookie-based login and a typed API layer covering every backend route.

**Architecture:** Next is a backend-for-frontend: tokens live in httpOnly cookies, `src/proxy.ts` guards pages and refreshes tokens, `app/api/[...path]` forwards browser calls to Nest. Endpoints are defined once as `(http) => ({...})` and bound to a server `Http` (direct to Nest) or a browser `Http` (via `/api`).

**Tech Stack:** Next.js 16.3 (App Router, `proxy.ts`), React 19, Tailwind v4, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-25-frontend-shell-auth-api-design.md`

## Global Constraints

- Next 16: middleware file is `src/proxy.ts` exporting `proxy`; `cookies()`, `params`, `searchParams` are async.
- Cookies: `nonoy_access`, `nonoy_refresh`, `nonoy_user` — httpOnly, `SameSite=Lax`, `Secure` in production, path `/`.
- Backend on `PORT=4000`; frontend reads `API_URL` (default `http://localhost:4000`). No `NEXT_PUBLIC_` API URL.
- Refresh when the access token expires within 30 s.
- Public (no login) pages: `/login`, `/theme`.
- Decimal fields are strings on the wire (`"60.25"`); dates are ISO strings.
- Use theme tokens from `globals.css` (`bg-primary`, `bg-surface`, `text-muted-foreground`, `shadow-card`, …); no raw colours.
- One commit per task; every commit message ends with the two attribution lines:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01X88YZ5Ftz8MffZY1ixcr4p`.

## Review Focus

1. **Deactivated user / revoked refresh token mid-session** → must land on `/login` with a notice, never loop `/login ↔ /admin`. Pinned by `guard()` tests (`expired` flag) in Task 2.
2. **Browser must never receive tokens** → `/api/auth/*` is not forwardable. Pinned by `isForwardable` tests in Task 3.
3. **Two requests refreshing at once** (backend rotates refresh tokens) → exactly one refresh call. Pinned by `refreshTokens` tests in Task 2.
4. **Garbage cookies** (non-JSON user, non-JWT access token) → treated as signed-out / expiring, no crash. Pinned by `parseUser` and `tokenExpiry` tests in Task 2.
5. **Prefix look-alikes** (`/administrator`, `/fieldwork`) → not treated as role areas. Pinned by `canAccess` tests in Task 2.

---

### Task 1: API client layer (`lib/api`) + Vitest + ports

**Files:**
- Modify: `frontend/package.json` (vitest dev dep, `test` script)
- Create: `frontend/vitest.config.ts`
- Modify: `frontend/.gitignore` (allow `.env.example`)
- Create: `frontend/.env.example`, `frontend/.env.local`
- Create: `backend/.env.example`; Modify: `backend/.env` (add `PORT=4000`)
- Create: `frontend/src/lib/env.ts`
- Create: `frontend/src/lib/api/http.ts`, `http.test.ts`
- Create: `frontend/src/lib/api/types.ts`
- Create: `frontend/src/lib/api/endpoints/{auth,users,buyers,plantations,trips,pickups,sales,recounts,expenses,activity-logs,reports,sync}.ts`
- Create: `frontend/src/lib/api/index.ts`, `frontend/src/lib/api/browser.ts`

**Interfaces:**
- Produces: `ApiError(status, message)`, `Http`, `Query`, `createHttp({ baseUrl, headers?, onUnauthorized?, fetch? })`, `buildUrl`, `errorMessage`; `createApi(http)` → `{ auth, users, buyers, plantations, trips, pickups, sales, recounts, expenses, activityLogs, reports, sync }`; `api` (browser); `API_URL`; all types in `types.ts` (`Role`, `SessionUser`, `Tokens`, `LoginResponse`, …).

- [ ] **Step 1: Install Vitest and add config**

```bash
cd frontend && npm i -D vitest
```

`frontend/package.json` scripts: add `"test": "vitest run"`.

`frontend/vitest.config.ts`:
```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 2: Env + ports**

`frontend/.gitignore`: below `.env*` add `!.env.example`.
`frontend/.env.example` and `frontend/.env.local`:
```
# Nest backend, called only from the Next server (never the browser)
API_URL=http://localhost:4000
```
`backend/.env`: append `PORT=4000`. `backend/.env.example` lists every key in `backend/.env` with empty values plus `PORT=4000`.

`frontend/src/lib/env.ts`:
```ts
// Server-side only in practice: no NEXT_PUBLIC_ prefix, so it is undefined in the browser.
export const API_URL = process.env.API_URL ?? "http://localhost:4000";
```

- [ ] **Step 3: Write failing tests for `http.ts`**

`frontend/src/lib/api/http.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { ApiError, buildUrl, createHttp, errorMessage } from "./http";

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("buildUrl", () => {
  it("joins base and path and drops undefined query values", () => {
    expect(buildUrl("/api/", "/reports/daily", { from: "2026-09-01", workerId: undefined }))
      .toBe("/api/reports/daily?from=2026-09-01");
  });
  it("omits ? when there is no query", () => {
    expect(buildUrl("http://x:4000", "/trips/me")).toBe("http://x:4000/trips/me");
  });
});

describe("errorMessage", () => {
  it("joins Nest validation message arrays", () => {
    expect(errorMessage({ message: ["a is bad", "b is bad"] }, 400)).toBe("a is bad, b is bad");
  });
  it("falls back to a status message", () => {
    expect(errorMessage(null, 500)).toBe("Request failed (500)");
  });
});

describe("createHttp", () => {
  it("sends JSON bodies with merged headers and parses JSON", async () => {
    const fetch = vi.fn(async () => json(200, { id: "1" }));
    const http = createHttp({ baseUrl: "http://x", headers: () => ({ Authorization: "Bearer t" }), fetch });
    await expect(http.post("/buyers", { name: "A" })).resolves.toEqual({ id: "1" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://x/buyers");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"name":"A"}');
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer t");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });
  it("returns undefined for an empty body", async () => {
    const http = createHttp({ baseUrl: "http://x", fetch: async () => new Response(null, { status: 204 }) });
    await expect(http.delete("/buyers/1")).resolves.toBeUndefined();
  });
  it("throws ApiError with status and Nest message", async () => {
    const http = createHttp({ baseUrl: "http://x", fetch: async () => json(400, { message: "bad kilo" }) });
    await expect(http.get("/x")).rejects.toMatchObject({ name: "ApiError", status: 400, message: "bad kilo" });
  });
  it("calls onUnauthorized on 401 and still throws", async () => {
    const onUnauthorized = vi.fn();
    const http = createHttp({ baseUrl: "http://x", onUnauthorized, fetch: async () => json(401, { message: "Unauthorized" }) });
    await expect(http.get("/x")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 4: Run — expect FAIL** (`Cannot find module './http'`)

Run: `cd frontend && npm test`

- [ ] **Step 5: Implement `http.ts`**

`frontend/src/lib/api/http.ts`:
```ts
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

    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
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
```

- [ ] **Step 6: Run — expect PASS** (`npm test`)

- [ ] **Step 7: Types**

`frontend/src/lib/api/types.ts`:
```ts
// Mirrors backend/prisma/schema.prisma and the Nest DTOs.
// Decimals arrive as strings ("60.25"); dates as ISO strings.

export type Role = "OWNER" | "ADMIN" | "WORKER";
export type PaymentMethod = "CASH" | "QR";
export type SyncStatus = "SYNCED" | "CONFLICT";
export type ActionType =
  | "PICKUP_STARTED"
  | "SALE_RECORDED"
  | "RECOUNT_PERFORMED"
  | "TRIP_ENDED"
  | "EXPENSE_RECORDED";

type Decimal = string;
type IsoDate = string;
type Ref = { id: string; name: string };

// ---- auth / users ----
export type SessionUser = { id: string; name: string; role: Role };
export type Tokens = { accessToken: string; refreshToken: string };
export type LoginResponse = Tokens & { user: SessionUser };
export type LoginInput = { phone: string; password: string };

export type User = {
  id: string;
  name: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: IsoDate;
};
export type RegisterInput = { phone: string; password: string; name: string };
export type CreateUserInput = RegisterInput & { role: Role };

// ---- reference data ----
export type Plantation = { id: string; name: string; address: string | null; createdAt: IsoDate };
export type PlantationInput = { name: string; address?: string };

export type Buyer = { id: string; name: string; location: string | null; notes: string | null; createdAt: IsoDate };
export type BuyerInput = { name: string; location?: string; notes?: string };

// ---- field records (all carry an offline-generated clientId) ----
type Synced = { id: string; clientId: string; createdAtClient: IsoDate; syncedAt: IsoDate };

export type Trip = {
  id: string;
  clientId: string;
  workerId: string;
  startedAt: IsoDate;
  endedAt: IsoDate | null;
  createdAtClient: IsoDate;
  syncedAt: IsoDate;
};
export type Pickup = Synced & { tripId: string; plantationId: string; chickenCount: number; totalKilo: Decimal };
export type Sale = Synced & {
  tripId: string;
  buyerId: string | null;
  chickenCount: number;
  totalKilo: Decimal;
  amount: Decimal;
  paymentMethod: PaymentMethod;
  syncStatus: SyncStatus;
  conflictReason: string | null;
};
export type Recount = Synced & {
  tripId: string;
  countedChicken: number;
  countedKilo: Decimal;
  expectedChicken: number;
  expectedKilo: Decimal;
  discrepancyFlagged: boolean;
};
export type Expense = Synced & { workerId: string; tripId: string | null; description: string; amount: Decimal };
export type ExpenseWithWorker = Expense & { worker: Ref };
export type ActivityLog = Synced & {
  workerId: string;
  tripId: string | null;
  actionType: ActionType;
  payload: Record<string, unknown>;
};

// ---- create inputs ----
type ClientStamp = { clientId: string; createdAtClient: IsoDate };
type Logged = ClientStamp & { activityLogClientId: string };

export type CreateTripInput = ClientStamp & { startedAt: IsoDate };
export type EndTripInput = { endedAt: IsoDate };
export type CreatePickupInput = Logged & { tripId: string; plantationId: string; chickenCount: number; totalKilo: Decimal };
export type CreateSaleInput = Logged & {
  tripId: string;
  buyerId?: string;
  chickenCount: number;
  totalKilo: Decimal;
  amount: Decimal;
  paymentMethod?: PaymentMethod;
};
export type CreateRecountInput = Logged & { tripId: string; countedChicken: number; countedKilo: Decimal };
export type CreateExpenseInput = Logged & { tripId?: string; description: string; amount: Decimal };
export type CreateActivityLogInput = ClientStamp & {
  tripId?: string;
  actionType: ActionType;
  payload: Record<string, unknown>;
};

// ---- sync ----
export type SyncBatch = {
  trips?: CreateTripInput[];
  tripEndings?: (EndTripInput & { tripId: string })[];
  pickups?: CreatePickupInput[];
  sales?: CreateSaleInput[];
  recounts?: CreateRecountInput[];
  expenses?: CreateExpenseInput[];
};
export type SyncResult =
  | { clientId: string; status: "ok"; serverId: string }
  | { clientId: string; status: "error"; error: string };
export type SyncResults = Record<keyof Required<SyncBatch>, SyncResult[]>;

// ---- reports ----
/** Calendar days (YYYY-MM-DD) in the report timezone; both ends inclusive; default last 7 days. */
export type ReportRange = { from?: string; to?: string };
export type DailyReportQuery = ReportRange & { workerId?: string };
type RangeInfo = { from: string; to: string; timezone: string };

export type StockSums = { chicken: number; kilo: Decimal };
export type SaleSums = StockSums & { count: number; amount: Decimal; cash: Decimal; qr: Decimal; conflicts: number };
export type ExpenseSums = { count: number; amount: Decimal };

export type DailyReport = RangeInfo & {
  workerId: string | null;
  days: { day: string; pickups: StockSums; sales: SaleSums; expenses: ExpenseSums; net: Decimal }[];
};
export type WorkerReport = RangeInfo & {
  workers: {
    worker: Ref & { isActive: boolean };
    trips: number;
    pickups: StockSums;
    sales: SaleSums;
    expenses: ExpenseSums;
    net: Decimal;
    flaggedRecounts: number;
  }[];
};
type TripRef = { id: string; startedAt: IsoDate; worker: Ref };
export type DiscrepancyReport = RangeInfo & {
  /** positive difference = more on hand than expected, negative = missing */
  recounts: (Recount & { trip: TripRef; chickenDifference: number; kiloDifference: Decimal })[];
  conflictedSales: (Sale & { trip: TripRef; buyer: Ref | null })[];
};
export type TripDetail = Trip & {
  worker: Ref;
  pickups: (Pickup & { plantation: Ref })[];
  sales: (Sale & { buyer: Ref | null })[];
  recounts: Recount[];
  expenses: Expense[];
  totals: {
    pickedUp: StockSums;
    sold: StockSums;
    remaining: StockSums;
    sales: { amount: Decimal; cash: Decimal; qr: Decimal };
    expenses: Decimal;
    net: Decimal;
  };
};
```

- [ ] **Step 8: Endpoint modules** (one per backend controller; paths and roles copied from `backend/src/*/*.controller.ts`)

`endpoints/auth.ts`:
```ts
import type { Http } from "../http";
import type { LoginInput, LoginResponse, Tokens } from "../types";

export const auth = (http: Http) => ({
  login: (input: LoginInput) => http.post<LoginResponse>("/auth/login", input),
  refresh: (refreshToken: string) => http.post<Tokens>("/auth/refresh", { refreshToken }),
  logout: () => http.post<{ message: string }>("/auth/logout"),
});
```

`endpoints/users.ts`:
```ts
import type { Http } from "../http";
import type { CreateUserInput, RegisterInput, User } from "../types";

export const users = (http: Http) => ({
  register: (input: RegisterInput) => http.post<User>("/users/register", input),
  /** OWNER/ADMIN — create staff with a chosen role */
  create: (input: CreateUserInput) => http.post<User>("/users", input),
  me: () => http.get<User>("/users/me"),
  /** OWNER/ADMIN — only the roles the caller may manage */
  list: () => http.get<User[]>("/users"),
  /** OWNER/ADMIN */
  setActive: (id: string, isActive: boolean) => http.patch<User>(`/users/${id}/active`, { isActive }),
});
```

`endpoints/buyers.ts`:
```ts
import type { Http } from "../http";
import type { Buyer, BuyerInput } from "../types";

export const buyers = (http: Http) => ({
  list: () => http.get<Buyer[]>("/buyers"),
  get: (id: string) => http.get<Buyer>(`/buyers/${id}`),
  create: (input: BuyerInput) => http.post<Buyer>("/buyers", input),
  /** OWNER/ADMIN */
  update: (id: string, input: Partial<BuyerInput>) => http.patch<Buyer>(`/buyers/${id}`, input),
  /** OWNER/ADMIN */
  remove: (id: string) => http.delete<Buyer>(`/buyers/${id}`),
});
```

`endpoints/plantations.ts`:
```ts
import type { Http } from "../http";
import type { Plantation, PlantationInput } from "../types";

export const plantations = (http: Http) => ({
  list: () => http.get<Plantation[]>("/plantations"),
  get: (id: string) => http.get<Plantation>(`/plantations/${id}`),
  /** OWNER/ADMIN */
  create: (input: PlantationInput) => http.post<Plantation>("/plantations", input),
  /** OWNER/ADMIN */
  update: (id: string, input: Partial<PlantationInput>) => http.patch<Plantation>(`/plantations/${id}`, input),
  /** OWNER/ADMIN */
  remove: (id: string) => http.delete<Plantation>(`/plantations/${id}`),
});
```

`endpoints/trips.ts`:
```ts
import type { Http } from "../http";
import type { CreateTripInput, EndTripInput, Trip } from "../types";

export const trips = (http: Http) => ({
  start: (input: CreateTripInput) => http.post<Trip>("/trips", input),
  end: (id: string, input: EndTripInput) => http.patch<Trip>(`/trips/${id}/end`, input),
  mine: () => http.get<Trip[]>("/trips/me"),
  /** OWNER/ADMIN */
  list: () => http.get<Trip[]>("/trips"),
});
```

`endpoints/pickups.ts`:
```ts
import type { Http } from "../http";
import type { CreatePickupInput, Pickup } from "../types";

export const pickups = (http: Http) => ({
  create: (input: CreatePickupInput) => http.post<Pickup>("/pickups", input),
  /** OWNER/ADMIN */
  list: () => http.get<Pickup[]>("/pickups"),
});
```

`endpoints/sales.ts`:
```ts
import type { Http } from "../http";
import type { CreateSaleInput, Sale } from "../types";

export const sales = (http: Http) => ({
  create: (input: CreateSaleInput) => http.post<Sale>("/sales", input),
  /** OWNER/ADMIN — `conflicted: true` lists only sales flagged at sync */
  list: (opts: { conflicted?: boolean } = {}) =>
    http.get<Sale[]>("/sales", { conflicted: opts.conflicted ? "true" : undefined }),
});
```

`endpoints/recounts.ts`:
```ts
import type { Http } from "../http";
import type { CreateRecountInput, Recount } from "../types";

export const recounts = (http: Http) => ({
  create: (input: CreateRecountInput) => http.post<Recount>("/recounts", input),
  /** OWNER/ADMIN */
  list: () => http.get<Recount[]>("/recounts"),
});
```

`endpoints/expenses.ts`:
```ts
import type { Http } from "../http";
import type { CreateExpenseInput, Expense, ExpenseWithWorker } from "../types";

export const expenses = (http: Http) => ({
  create: (input: CreateExpenseInput) => http.post<Expense>("/expenses", input),
  mine: () => http.get<Expense[]>("/expenses/me"),
  /** OWNER/ADMIN */
  list: () => http.get<ExpenseWithWorker[]>("/expenses"),
});
```

`endpoints/activity-logs.ts`:
```ts
import type { Http } from "../http";
import type { ActivityLog, CreateActivityLogInput } from "../types";

export const activityLogs = (http: Http) => ({
  create: (input: CreateActivityLogInput) => http.post<ActivityLog>("/activity-logs", input),
  /** OWNER/ADMIN */
  list: () => http.get<ActivityLog[]>("/activity-logs"),
});
```

`endpoints/reports.ts`:
```ts
import type { Http } from "../http";
import type { DailyReport, DailyReportQuery, DiscrepancyReport, ReportRange, TripDetail, WorkerReport } from "../types";

export const reports = (http: Http) => ({
  /** OWNER/ADMIN */
  daily: (q: DailyReportQuery = {}) => http.get<DailyReport>("/reports/daily", q),
  /** OWNER/ADMIN */
  workers: (q: ReportRange = {}) => http.get<WorkerReport>("/reports/workers", q),
  /** OWNER/ADMIN */
  discrepancies: (q: ReportRange = {}) => http.get<DiscrepancyReport>("/reports/discrepancies", q),
  /** any role — workers only their own trips */
  trip: (id: string) => http.get<TripDetail>(`/reports/trips/${id}`),
});
```

`endpoints/sync.ts`:
```ts
import type { Http } from "../http";
import type { SyncBatch, SyncResults } from "../types";

export const sync = (http: Http) => ({
  /** Worker offline batch; each item reports ok/error on its own */
  push: (batch: SyncBatch) => http.post<SyncResults>("/sync", batch),
});
```

- [ ] **Step 9: `index.ts` and `browser.ts`**

`frontend/src/lib/api/index.ts`:
```ts
import type { Http } from "./http";
import { activityLogs } from "./endpoints/activity-logs";
import { auth } from "./endpoints/auth";
import { buyers } from "./endpoints/buyers";
import { expenses } from "./endpoints/expenses";
import { pickups } from "./endpoints/pickups";
import { plantations } from "./endpoints/plantations";
import { recounts } from "./endpoints/recounts";
import { reports } from "./endpoints/reports";
import { sales } from "./endpoints/sales";
import { sync } from "./endpoints/sync";
import { trips } from "./endpoints/trips";
import { users } from "./endpoints/users";

export function createApi(http: Http) {
  return {
    auth: auth(http),
    users: users(http),
    buyers: buyers(http),
    plantations: plantations(http),
    trips: trips(http),
    pickups: pickups(http),
    sales: sales(http),
    recounts: recounts(http),
    expenses: expenses(http),
    activityLogs: activityLogs(http),
    reports: reports(http),
    sync: sync(http),
  };
}

export type Api = ReturnType<typeof createApi>;
export { ApiError } from "./http";
export type * from "./types";
```

`frontend/src/lib/api/browser.ts`:
```ts
"use client";

// For client components: calls go to our own /api/*, which adds the token server-side.
import { createApi } from ".";
import { createHttp } from "./http";

export const api = createApi(
  createHttp({
    baseUrl: "/api",
    // the /api forwarder already tried a refresh — the session is really over
    onUnauthorized: () => window.location.assign("/login?expired=1"),
  }),
);
```

- [ ] **Step 10: Verify** — `npm test` PASS, `npx tsc --noEmit` clean, `npx eslint src/lib` clean.

- [ ] **Step 11: Commit** — `git add frontend backend/.env.example` (never `backend/.env`), message `Add typed API client layer for every backend route`.

---

### Task 2: Session & routing logic (`lib/auth`) + `serverApi`

**Files:**
- Create: `frontend/src/lib/auth/roles.ts`, `roles.test.ts`
- Create: `frontend/src/lib/auth/tokens.ts`, `tokens.test.ts`
- Create: `frontend/src/lib/auth/refresh.ts`, `refresh.test.ts`
- Create: `frontend/src/lib/auth/cookies.ts`, `cookies.test.ts`
- Create: `frontend/src/lib/auth/session.ts`
- Create: `frontend/src/lib/api/server.ts`

**Interfaces:**
- Consumes: `Role`, `SessionUser`, `Tokens`, `createApi`, `createHttp`, `API_URL` (Task 1).
- Produces:
  - `homeFor(role: Role): string`, `canAccess(role: Role, pathname: string): boolean`, `isPublic(pathname: string): boolean`,
    `guard(s: { pathname: string; user: SessionUser | null; expired: boolean }): { action: "next" } | { action: "redirect"; to: string } | { action: "clear" }`
  - `tokenExpiry(token: string): number | null`, `isExpiring(token: string | undefined, now?: number): boolean`
  - `refreshTokens(baseUrl: string, refreshToken: string, fetchImpl?: typeof fetch): Promise<Tokens | null>`
  - `COOKIE`, `cookieOptions`, `parseUser(raw?: string): SessionUser | null`, `writeSessionCookies(jar, tokens, user?)`, `clearSessionCookies(jar)` where `jar` has `set(name, value, opts)` / `delete(name)`
  - `getSession(): Promise<{ user: SessionUser; accessToken?: string; refreshToken: string } | null>`, `setSession(tokens, user)`, `clearSession()`
  - `serverApi` (authed; 401 → redirect `/login?expired=1`), `publicApi` (no auth)

- [ ] **Step 1: Failing tests**

`roles.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { canAccess, guard, homeFor, isPublic } from "./roles";
import type { SessionUser } from "@/lib/api/types";

const owner: SessionUser = { id: "1", name: "O", role: "OWNER" };
const worker: SessionUser = { id: "2", name: "W", role: "WORKER" };

describe("roles", () => {
  it("maps roles to homes", () => {
    expect(homeFor("OWNER")).toBe("/admin");
    expect(homeFor("ADMIN")).toBe("/admin");
    expect(homeFor("WORKER")).toBe("/field");
  });
  it("matches areas by whole segment, not prefix", () => {
    expect(canAccess("WORKER", "/field/trips")).toBe(true);
    expect(canAccess("WORKER", "/admin")).toBe(false);
    expect(canAccess("OWNER", "/field")).toBe(false);
    expect(canAccess("WORKER", "/administrator")).toBe(true); // not the /admin area
    expect(canAccess("OWNER", "/fieldwork")).toBe(true); // not the /field area
  });
  it("knows public pages", () => {
    expect(isPublic("/login")).toBe(true);
    expect(isPublic("/theme")).toBe(true);
    expect(isPublic("/admin")).toBe(false);
  });
});

describe("guard", () => {
  const g = (pathname: string, user: SessionUser | null, expired = false) => guard({ pathname, user, expired });

  it("sends signed-out users to /login", () => {
    expect(g("/admin", null)).toEqual({ action: "redirect", to: "/login" });
    expect(g("/", null)).toEqual({ action: "redirect", to: "/login" });
  });
  it("lets anyone see public pages", () => {
    expect(g("/theme", null)).toEqual({ action: "next" });
    expect(g("/login", null)).toEqual({ action: "next" });
  });
  it("bounces signed-in users off /login to their home", () => {
    expect(g("/login", owner)).toEqual({ action: "redirect", to: "/admin" });
  });
  it("clears the session on /login?expired instead of bouncing (no redirect loop)", () => {
    expect(g("/login", owner, true)).toEqual({ action: "clear" });
  });
  it("sends users to their own area", () => {
    expect(g("/admin/reports", worker)).toEqual({ action: "redirect", to: "/field" });
    expect(g("/field", owner)).toEqual({ action: "redirect", to: "/admin" });
    expect(g("/", worker)).toEqual({ action: "redirect", to: "/field" });
    expect(g("/admin", owner)).toEqual({ action: "next" });
  });
});
```

`tokens.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { isExpiring, tokenExpiry } from "./tokens";

const jwt = (payload: object) => `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

describe("tokens", () => {
  it("reads exp in ms", () => {
    expect(tokenExpiry(jwt({ exp: 1000 }))).toBe(1_000_000);
  });
  it("returns null for garbage", () => {
    expect(tokenExpiry("not-a-jwt")).toBeNull();
    expect(tokenExpiry(jwt({ sub: "x" }))).toBeNull();
  });
  it("treats missing, garbage and near-expiry tokens as expiring", () => {
    const now = 1_000_000;
    expect(isExpiring(undefined, now)).toBe(true);
    expect(isExpiring("garbage", now)).toBe(true);
    expect(isExpiring(jwt({ exp: now / 1000 + 10 }), now)).toBe(true); // 10s left < 30s skew
    expect(isExpiring(jwt({ exp: now / 1000 + 300 }), now)).toBe(false);
  });
});
```

`refresh.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { refreshTokens } from "./refresh";

const ok = () => new Response(JSON.stringify({ accessToken: "a2", refreshToken: "r2" }), { status: 200 });

describe("refreshTokens", () => {
  it("shares one request between concurrent callers with the same token", async () => {
    const fetch = vi.fn(async () => ok());
    const [a, b] = await Promise.all([refreshTokens("http://x", "r1", fetch), refreshTokens("http://x", "r1", fetch)]);
    expect(fetch).toHaveBeenCalledOnce();
    expect(a).toEqual({ accessToken: "a2", refreshToken: "r2" });
    expect(b).toEqual(a);
  });
  it("posts the refresh token to /auth/refresh", async () => {
    const fetch = vi.fn(async () => ok());
    await refreshTokens("http://x", "r-post", fetch);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://x/auth/refresh");
    expect(init.body).toBe('{"refreshToken":"r-post"}');
  });
  it("returns null when the backend rejects or is unreachable", async () => {
    expect(await refreshTokens("http://x", "r-bad", async () => new Response("{}", { status: 401 }))).toBeNull();
    expect(await refreshTokens("http://x", "r-down", async () => { throw new Error("ECONNREFUSED"); })).toBeNull();
  });
});
```

`cookies.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { COOKIE, clearSessionCookies, parseUser, writeSessionCookies } from "./cookies";

describe("cookies", () => {
  it("parses a valid user cookie", () => {
    expect(parseUser('{"id":"1","name":"A","role":"ADMIN"}')).toEqual({ id: "1", name: "A", role: "ADMIN" });
  });
  it("rejects garbage and unknown roles", () => {
    expect(parseUser(undefined)).toBeNull();
    expect(parseUser("{not json")).toBeNull();
    expect(parseUser('{"id":"1","name":"A","role":"GOD"}')).toBeNull();
  });
  it("writes tokens and user, and clears all three", () => {
    const jar = new Map<string, string>();
    const target = { set: (n: string, v: string) => void jar.set(n, v), delete: (n: string) => void jar.delete(n) };
    writeSessionCookies(target, { accessToken: "a", refreshToken: "r" }, { id: "1", name: "A", role: "WORKER" });
    expect(jar.get(COOKIE.access)).toBe("a");
    expect(jar.get(COOKIE.refresh)).toBe("r");
    expect(parseUser(jar.get(COOKIE.user))).toEqual({ id: "1", name: "A", role: "WORKER" });
    clearSessionCookies(target);
    expect(jar.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (modules missing). `npm test`

- [ ] **Step 3: Implement**

`roles.ts`:
```ts
import type { Role, SessionUser } from "@/lib/api/types";

const HOME: Record<Role, string> = { OWNER: "/admin", ADMIN: "/admin", WORKER: "/field" };
const AREAS: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["OWNER", "ADMIN"] },
  { prefix: "/field", roles: ["WORKER"] },
];
const PUBLIC = ["/login", "/theme"];

const within = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export const homeFor = (role: Role) => HOME[role];
export const isPublic = (pathname: string) => PUBLIC.some((p) => within(pathname, p));

// paths outside a role area are open to any signed-in user
export function canAccess(role: Role, pathname: string) {
  const area = AREAS.find((a) => within(pathname, a.prefix));
  return !area || area.roles.includes(role);
}

export type GuardResult = { action: "next" } | { action: "redirect"; to: string } | { action: "clear" };

// Optimistic page guard for proxy.ts — the backend's RolesGuard is the real authority.
export function guard({ pathname, user, expired }: { pathname: string; user: SessionUser | null; expired: boolean }): GuardResult {
  if (pathname === "/login" && user) {
    // ?expired=1 means the backend rejected the session: drop it rather than bounce back (loop)
    return expired ? { action: "clear" } : { action: "redirect", to: homeFor(user.role) };
  }
  if (isPublic(pathname)) return { action: "next" };
  if (!user) return { action: "redirect", to: "/login" };
  if (pathname === "/" || !canAccess(user.role, pathname)) return { action: "redirect", to: homeFor(user.role) };
  return { action: "next" };
}
```

`tokens.ts`:
```ts
// Reads a JWT's exp without verifying it — only to decide when to refresh.
export function tokenExpiry(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

const SKEW_MS = 30_000;

export function isExpiring(token: string | undefined, now = Date.now()) {
  const exp = token ? tokenExpiry(token) : null;
  return exp === null || exp - now < SKEW_MS;
}
```

`refresh.ts`:
```ts
import type { Tokens } from "@/lib/api/types";

// The backend rotates refresh tokens, so a second refresh with the same old token
// fails. Callers holding the same token share one request, and the result is kept
// briefly for requests that were already in flight with the old cookie.
const inflight = new Map<string, Promise<Tokens | null>>();
const KEEP_MS = 10_000;

export function refreshTokens(baseUrl: string, refreshToken: string, fetchImpl: typeof fetch = fetch) {
  let pending = inflight.get(refreshToken);
  if (!pending) {
    pending = (async () => {
      try {
        const res = await fetchImpl(`${baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
          cache: "no-store",
        });
        return res.ok ? ((await res.json()) as Tokens) : null;
      } catch {
        return null;
      } finally {
        setTimeout(() => inflight.delete(refreshToken), KEEP_MS).unref?.();
      }
    })();
    inflight.set(refreshToken, pending);
  }
  return pending;
}
```

`cookies.ts`:
```ts
import type { Role, SessionUser, Tokens } from "@/lib/api/types";

export const COOKIE = { access: "nonoy_access", refresh: "nonoy_refresh", user: "nonoy_user" } as const;

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // outlives the refresh token; the backend decides real expiry
};

// Works with both next/headers cookies() and NextResponse.cookies / NextRequest.cookies
type Jar = {
  set(name: string, value: string, options?: typeof cookieOptions): unknown;
  delete(name: string): unknown;
};

const ROLES: Role[] = ["OWNER", "ADMIN", "WORKER"];

export function parseUser(raw?: string): SessionUser | null {
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as Partial<SessionUser>;
    if (typeof u.id === "string" && typeof u.name === "string" && ROLES.includes(u.role as Role)) {
      return { id: u.id, name: u.name, role: u.role as Role };
    }
  } catch {}
  return null;
}

export function writeSessionCookies(jar: Jar, tokens: Tokens, user?: SessionUser) {
  jar.set(COOKIE.access, tokens.accessToken, cookieOptions);
  jar.set(COOKIE.refresh, tokens.refreshToken, cookieOptions);
  if (user) jar.set(COOKIE.user, JSON.stringify(user), cookieOptions);
}

export function clearSessionCookies(jar: Jar) {
  for (const name of Object.values(COOKIE)) jar.delete(name);
}
```

`session.ts`:
```ts
// Server components, server actions and route handlers only (next/headers).
import { cookies } from "next/headers";
import type { SessionUser, Tokens } from "@/lib/api/types";
import { COOKIE, clearSessionCookies, parseUser, writeSessionCookies } from "./cookies";

export async function getSession() {
  const jar = await cookies();
  const user = parseUser(jar.get(COOKIE.user)?.value);
  const refreshToken = jar.get(COOKIE.refresh)?.value;
  if (!user || !refreshToken) return null;
  return { user, refreshToken, accessToken: jar.get(COOKIE.access)?.value };
}

export async function setSession(tokens: Tokens, user: SessionUser) {
  writeSessionCookies(await cookies(), tokens, user);
}

export async function clearSession() {
  clearSessionCookies(await cookies());
}
```

`frontend/src/lib/api/server.ts`:
```ts
// For server components and server actions: talks to Nest directly.
// proxy.ts has already refreshed the access token before the page renders.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createApi } from ".";
import { createHttp } from "./http";
import { API_URL } from "@/lib/env";
import { COOKIE } from "@/lib/auth/cookies";

export const serverApi = createApi(
  createHttp({
    baseUrl: API_URL,
    headers: async () => {
      const token = (await cookies()).get(COOKIE.access)?.value;
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    // deactivated user or revoked session — proxy clears cookies on this URL
    onUnauthorized: () => redirect("/login?expired=1"),
  }),
);

// unauthenticated calls (login)
export const publicApi = createApi(createHttp({ baseUrl: API_URL }));
```

- [ ] **Step 4: Run — expect PASS** (`npm test`), then `npx tsc --noEmit`.

- [ ] **Step 5: Commit** — `Add session cookies, role routing and token refresh logic`.

---

### Task 3: `/api/*` forwarder

**Files:**
- Create: `frontend/src/lib/api/forward.ts`, `forward.test.ts`
- Create: `frontend/src/app/api/[...path]/route.ts`

**Interfaces:**
- Consumes: `API_URL`, `COOKIE`, `writeSessionCookies`, `clearSessionCookies`, `refreshTokens`.
- Produces: `isForwardable(path: string[]): boolean`, `targetUrl(base: string, path: string[], search: string): string`; HTTP `GET|POST|PATCH|PUT|DELETE /api/<backend path>`.

- [ ] **Step 1: Failing test** — `forward.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { isForwardable, targetUrl } from "./forward";

describe("forward", () => {
  it("never exposes auth endpoints (they return tokens)", () => {
    expect(isForwardable(["auth", "login"])).toBe(false);
    expect(isForwardable(["auth", "refresh"])).toBe(false);
    expect(isForwardable(["AUTH", "login"])).toBe(false);
    expect(isForwardable(["trips", "me"])).toBe(true);
  });
  it("rejects path traversal segments", () => {
    expect(isForwardable(["..", "auth", "login"])).toBe(false);
    expect(isForwardable(["trips", "."])).toBe(false);
  });
  it("builds the backend URL with encoded segments and the query", () => {
    expect(targetUrl("http://x:4000", ["reports", "daily"], "?from=2026-09-01")).toBe("http://x:4000/reports/daily?from=2026-09-01");
    expect(targetUrl("http://x:4000/", ["buyers", "a b"], "")).toBe("http://x:4000/buyers/a%20b");
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** — `forward.ts`:
```ts
// Rules for what the /api/* forwarder may pass on to Nest.

// /auth/* hands out tokens; those must stay in httpOnly cookies, so the browser
// logs in through the server action instead.
export function isForwardable(path: string[]) {
  if (path.some((s) => s === "." || s === ".." || s === "")) return false;
  return path[0]?.toLowerCase() !== "auth";
}

export function targetUrl(base: string, path: string[], search: string) {
  return `${base.replace(/\/$/, "")}/${path.map(encodeURIComponent).join("/")}${search}`;
}
```

`app/api/[...path]/route.ts`:
```ts
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "@/lib/env";
import { isForwardable, targetUrl } from "@/lib/api/forward";
import { COOKIE, clearSessionCookies, writeSessionCookies } from "@/lib/auth/cookies";
import { refreshTokens } from "@/lib/auth/refresh";

type Ctx = { params: Promise<{ path: string[] }> };

// Browser → /api/<path> → Nest /<path>, with the access token from the cookie.
// On 401 it refreshes once and retries, saving the rotated tokens.
async function forward(request: NextRequest, { params }: Ctx) {
  const { path } = await params;
  if (!isForwardable(path)) return NextResponse.json({ statusCode: 404, message: "Not found" }, { status: 404 });

  const jar = await cookies();
  const refresh = jar.get(COOKIE.refresh)?.value;
  if (!refresh) return NextResponse.json({ statusCode: 401, message: "Not signed in" }, { status: 401 });

  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await request.text();
  const url = targetUrl(API_URL, path, request.nextUrl.search);
  const send = (token?: string) =>
    fetch(url, {
      method,
      body: body || undefined,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": request.headers.get("content-type") ?? "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await send(jar.get(COOKIE.access)?.value);
  const tokens = res.status === 401 ? await refreshTokens(API_URL, refresh) : null;
  if (tokens) res = await send(tokens.accessToken);

  const out = new NextResponse(res.status === 204 ? null : await res.arrayBuffer(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
  if (tokens) writeSessionCookies(out.cookies, tokens);
  else if (res.status === 401) clearSessionCookies(out.cookies);
  return out;
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
```

- [ ] **Step 4: Run — PASS**; `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `Add /api forwarder to the backend with token refresh`.

---

### Task 4: `proxy.ts` page guard + root redirect

**Files:**
- Create: `frontend/src/proxy.ts`
- Modify: `frontend/src/app/page.tsx` (replace scaffold)

**Interfaces:**
- Consumes: `guard`, `isExpiring`, `refreshTokens`, `COOKIE`, `parseUser`, `writeSessionCookies`, `clearSessionCookies`, `API_URL`.

- [ ] **Step 1: Implement `proxy.ts`**
```ts
import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "@/lib/env";
import { COOKIE, clearSessionCookies, parseUser, writeSessionCookies } from "@/lib/auth/cookies";
import { refreshTokens } from "@/lib/auth/refresh";
import { guard } from "@/lib/auth/roles";
import { isExpiring } from "@/lib/auth/tokens";

// Runs before every page: signed-in / role checks, and refreshes the access token
// here because server components can't write cookies.
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const refresh = request.cookies.get(COOKIE.refresh)?.value;
  const user = refresh ? parseUser(request.cookies.get(COOKIE.user)?.value) : null;

  const decision = guard({ pathname, user, expired: searchParams.has("expired") });
  if (decision.action === "clear") {
    const res = NextResponse.next();
    clearSessionCookies(res.cookies);
    return res;
  }
  if (decision.action === "redirect") return NextResponse.redirect(new URL(decision.to, request.url));
  if (!user || !refresh || !isExpiring(request.cookies.get(COOKIE.access)?.value)) return NextResponse.next();

  const tokens = await refreshTokens(API_URL, refresh);
  if (!tokens) {
    const res = NextResponse.redirect(new URL("/login?expired=1", request.url));
    clearSessionCookies(res.cookies);
    return res;
  }
  // new token must reach this render (request) and the browser (response)
  request.cookies.set(COOKIE.access, tokens.accessToken);
  request.cookies.set(COOKIE.refresh, tokens.refreshToken);
  const res = NextResponse.next({ request: { headers: request.headers } });
  writeSessionCookies(res.cookies, tokens);
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
```

- [ ] **Step 2: Replace `app/page.tsx`** (proxy redirects `/` already; this is the fallback)
```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/roles";

// Landing page comes later; for now "/" just routes by role.
export default async function Home() {
  const session = await getSession();
  redirect(session ? homeFor(session.user.role) : "/login");
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`, `npm test`, dev server: `curl -sI localhost:3000/admin` → `307` with `location: /login`; `curl -sI localhost:3000/theme` → `200`.
- [ ] **Step 4: Commit** — `Add proxy page guard with role redirects and token refresh`.

---

### Task 5: Login & logout

**Files:**
- Create: `frontend/src/app/(auth)/layout.tsx`
- Create: `frontend/src/app/(auth)/login/page.tsx`, `login-form.tsx`, `actions.ts`

**Interfaces:**
- Consumes: `publicApi`, `ApiError`, `setSession`, `clearSession`, `getSession`, `homeFor`, `API_URL`, `Logo`.
- Produces: `login(prev: LoginState, form: FormData): Promise<LoginState>`, `logout(): Promise<void>`, `type LoginState = { error?: string; phone?: string } | undefined`.

- [ ] **Step 1: `actions.ts`**
```ts
"use server";

import { redirect } from "next/navigation";
import { ApiError, type LoginResponse } from "@/lib/api";
import { publicApi } from "@/lib/api/server";
import { API_URL } from "@/lib/env";
import { homeFor } from "@/lib/auth/roles";
import { clearSession, getSession, setSession } from "@/lib/auth/session";

export type LoginState = { error?: string; phone?: string } | undefined;

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const phone = String(form.get("phone") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!phone || !password) return { error: "Enter your phone number and password.", phone };

  let res: LoginResponse;
  try {
    res = await publicApi.auth.login({ phone, password });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return { error: "Wrong phone number or password.", phone };
    if (e instanceof ApiError && e.status === 429) return { error: "Too many attempts. Wait a minute and try again.", phone };
    if (e instanceof ApiError && e.status === 400) return { error: e.message, phone };
    return { error: "Can't reach the server. Check your connection and try again.", phone };
  }

  await setSession(res, res.user);
  redirect(homeFor(res.user.role));
}

export async function logout() {
  const session = await getSession();
  // revoke the refresh token server-side; sign out locally even if this fails
  if (session?.accessToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    }).catch(() => {});
  }
  await clearSession();
  redirect("/login");
}
```

- [ ] **Step 2: `(auth)/layout.tsx`**
```tsx
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <main className="flex flex-1 items-center justify-center bg-background px-4 py-12">{children}</main>;
}
```

- [ ] **Step 3: `login/page.tsx`**
```tsx
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { expired } = await searchParams;
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-3">
        <Logo />
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">Use the phone number your manager registered.</p>
      </div>
      {expired !== undefined && (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">Your session ended. Please sign in again.</p>
      )}
      <LoginForm />
    </div>
  );
}
```

- [ ] **Step 4: `login/login-form.tsx`**
```tsx
"use client";

import { useActionState } from "react";
import { login } from "./actions";

const input =
  "w-full rounded-md border border-input bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4 rounded-xl bg-surface p-6 shadow-card">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Phone number</span>
        <input name="phone" type="tel" inputMode="tel" autoComplete="username" required
          defaultValue={state?.phone} placeholder="09XX XXX XXXX" className={input} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <button type="submit" disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover active:bg-primary-active disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Verify** — `npx tsc --noEmit`, `npx eslint src`; with backend on 4000, sign in as seeded admin in the browser → lands on `/admin` (404 until Task 6 is fine); wrong password → error shown.
- [ ] **Step 6: Commit** — `Add login and logout with httpOnly session cookies`.

---

### Task 6: Role shells

**Files:**
- Create: `frontend/src/components/shell/nav-link.tsx`, `user-menu.tsx`, `admin-sidebar.tsx`, `field-nav.tsx`
- Create: `frontend/src/app/admin/layout.tsx`, `page.tsx`
- Create: `frontend/src/app/field/layout.tsx`, `page.tsx`

**Interfaces:**
- Consumes: `getSession`, `logout`, `Logo`, `SessionUser`.
- Produces: `NavItem = { href: string; label: string }`, `NavLink`, `UserMenu({ user })`, `AdminSidebar({ user })`, `FieldNav()`.

- [ ] **Step 1: `nav-link.tsx`**
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

// exact match for an area's home, prefix match for everything under it
export function NavLink({ href, label, exact, className = "" }: NavItem & { exact?: boolean; className?: string }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`${className} ${active ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      {label}
    </Link>
  );
}
```

- [ ] **Step 2: `user-menu.tsx`**
```tsx
import { logout } from "@/app/(auth)/login/actions";
import type { SessionUser } from "@/lib/api/types";

const ROLE_LABEL = { OWNER: "Owner", ADMIN: "Admin", WORKER: "Worker" } as const;

export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
      </div>
      <form action={logout}>
        <button type="submit" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          Log out
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: `admin-sidebar.tsx`**
```tsx
import { Logo } from "@/components/logo";
import type { SessionUser } from "@/lib/api/types";
import { NavLink, type NavItem } from "./nav-link";
import { UserMenu } from "./user-menu";

// add entries here as admin pages are built
const NAV: NavItem[] = [{ href: "/admin", label: "Dashboard" }];

export function AdminSidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="flex flex-col gap-6 border-b bg-surface p-4 md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
      <div className="flex items-center gap-3">
        <Logo className="size-9" />
        <span className="font-semibold tracking-tight">Nonoy</span>
      </div>
      <nav className="flex gap-1 md:flex-col">
        {NAV.map((item) => (
          <NavLink key={item.href} {...item} exact={item.href === "/admin"} className="rounded-md px-3 py-2 text-sm font-medium transition-colors" />
        ))}
      </nav>
      <div className="md:mt-auto">
        <UserMenu user={user} />
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: `field-nav.tsx`**
```tsx
import { NavLink, type NavItem } from "./nav-link";

// add entries here as field pages are built
const NAV: NavItem[] = [{ href: "/field", label: "Home" }];

export function FieldNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t bg-surface pb-[env(safe-area-inset-bottom)]">
      {NAV.map((item) => (
        <NavLink key={item.href} {...item} exact={item.href === "/field"} className="flex-1 py-3 text-center text-sm font-medium transition-colors" />
      ))}
    </nav>
  );
}
```

- [ ] **Step 5: Layouts and placeholder pages**

`admin/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/shell/admin-sidebar";
import { getSession } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();
  if (!session) redirect("/login"); // proxy normally handles this
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AdminSidebar user={session.user} />
      <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
```

`admin/page.tsx`:
```tsx
import { getSession } from "@/lib/auth/session";

export default async function AdminHome() {
  const session = await getSession();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome, {session?.user.name}</h1>
      <div className="rounded-xl bg-surface p-6 text-sm text-muted-foreground shadow-card">
        Reports and daily totals will appear here.
      </div>
    </div>
  );
}
```

`field/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { FieldNav } from "@/components/shell/field-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { getSession } from "@/lib/auth/session";

export default async function FieldLayout({ children }: LayoutProps<"/field">) {
  const session = await getSession();
  if (!session) redirect("/login"); // proxy normally handles this
  return (
    <div className="flex flex-1 flex-col pb-16">
      <header className="flex items-center gap-3 border-b bg-surface px-4 py-3">
        <Logo className="size-8" />
        <div className="flex-1">
          <UserMenu user={session.user} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>
      <FieldNav />
    </div>
  );
}
```

`field/page.tsx`:
```tsx
import { getSession } from "@/lib/auth/session";

export default async function FieldHome() {
  const session = await getSession();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Hi, {session?.user.name}</h1>
      <div className="rounded-xl bg-surface p-5 text-sm text-muted-foreground shadow-card">
        Your trips, sales and expenses will appear here.
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify** — `npx tsc --noEmit`, `npx eslint src`, `npm test`, `npm run build`.
- [ ] **Step 7: Commit** — `Add admin and field shells with role-based navigation`.

---

### Task 7: End-to-end check (no commit unless fixes)

- [ ] Backend: `cd backend && npm run start:dev` (port 4000); seed admin exists (`SEED_ADMIN_PHONE` / `SEED_ADMIN_PASSWORD` in `backend/.env`).
- [ ] Frontend: `cd frontend && npm run dev`.
- [ ] Signed out: `/admin` → `/login`; `/theme` renders.
- [ ] Wrong password → "Wrong phone number or password."
- [ ] Admin login → `/admin` shows "Welcome, <name>"; `/field` → back to `/admin`; `/login` → `/admin`.
- [ ] `curl` `/api/auth/login` → 404; signed-in `fetch('/api/users/me')` from the browser → 200 JSON.
- [ ] Log out → `/login`; `/admin` → `/login`.
- [ ] Mobile width (390px) screenshots of `/login`, `/admin`; send to the user.
