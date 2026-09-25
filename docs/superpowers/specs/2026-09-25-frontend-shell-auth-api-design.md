# Frontend shell, auth & API layer — design

Date: 2026-09-25 · Status: approved in chat

## Goal

Give the Next.js 16 frontend (`frontend/`) a clean, route-based structure that both
roles can log into, with a typed API layer in `lib/` covering every backend route so
later screens only have to call functions.

## Users

One app, split by role after login:

- **OWNER / ADMIN** → `/admin/*` — desktop-first management shell (sidebar).
- **WORKER** → `/field/*` — mobile-first field shell (bottom nav).

## Decisions

- Tokens live in **httpOnly cookies** set by Next; the browser never sees them.
  The browser calls Next at `/api/*`; Next forwards to Nest with `Authorization: Bearer`.
- Backend moves to **port 4000** (`PORT=4000`) so it no longer clashes with Next on 3000.
  CORS is irrelevant because only the Next server talks to Nest.
- Next 16 renamed middleware to **`proxy.ts`**; it lives at `src/proxy.ts`.

## Folder structure (`frontend/src/`)

```
proxy.ts                       optimistic guard, role redirect, token refresh
app/
  layout.tsx  globals.css
  page.tsx                     redirect: /login or role home (landing page is future work)
  theme/page.tsx               style guide
  (auth)/login/page.tsx        phone + password form
  (auth)/login/actions.ts      login / logout server actions
  admin/layout.tsx  page.tsx   OWNER/ADMIN shell + dashboard placeholder
  field/layout.tsx  page.tsx   WORKER shell + home placeholder
  api/[...path]/route.ts       forwarder to Nest (adds bearer, refresh-and-retry once on 401)
components/
  logo.tsx
  shell/admin-sidebar.tsx  field-nav.tsx  user-menu.tsx
lib/
  env.ts                       API_URL (server-only)
  auth/session.ts              cookie read/write (server-only)
  auth/roles.ts                role → home path, path → allowed roles
  api/http.ts                  Http interface + fetch impl: JSON, ApiError
  api/types.ts                 DTO types mirroring backend
  api/endpoints/*.ts           auth, trips, sales, expenses, buyers, plantations, pickups,
                               recounts, reports, users, sync, activity-logs
  api/index.ts                 createApi(http) → { trips, sales, … }
  api/server.ts                serverApi — direct to Nest with cookie token (server-only)
  api/browser.ts               api — calls /api/* (client components)
```

Each endpoint module is `(http: Http) => ({ ...typed functions })`, so it is defined
once and used by both `serverApi` and `api`.

## Auth flow

1. **Login** (server action): POST Nest `/auth/login` `{ phone, password }` →
   `{ accessToken, refreshToken, user: { id, name, role } }`. Set httpOnly cookies
   `nonoy_access`, `nonoy_refresh`, `nonoy_user` (JSON), `SameSite=Lax`, `Secure` in
   production. Redirect to role home. Errors (401, 429 throttle) shown on the form.
2. **proxy.ts** on page requests:
   - no `nonoy_refresh` → redirect `/login` (except `/login`, `/theme`, assets, `/api`).
   - on `/login` while signed in → role home.
   - path not allowed for role (`/admin` for WORKER, `/field` for OWNER/ADMIN) → role home.
   - access token missing or expiring within 30s (decode `exp`, no verify) → POST
     `/auth/refresh`, write new cookies onto both the forwarded request and the response.
     Refresh failure → clear cookies, redirect `/login`.
3. **`/api/[...path]`**: forwards method, query, JSON body; on 401 refreshes once and
   retries; updates cookies on the response. Concurrent refreshes for the same refresh
   token share one in-flight promise (the backend rotates tokens, so a second refresh with
   the old token would fail).
4. **Logout** (server action): POST Nest `/auth/logout` with bearer (ignore failure),
   clear cookies, redirect `/login`.

The proxy is an optimistic check only; the backend's `RolesGuard` remains the authority.

## Config

- `backend/.env` and `.env.example`: `PORT=4000`.
- `frontend/.env.local` (gitignored) and `frontend/.env.example`: `API_URL=http://localhost:4000`.

## Out of scope

Landing page, real dashboard content, local cache + worker offline queue (the typed `/sync` endpoint
exists), nav entries for pages not yet built, real logo.

## Testing

- Vitest in `frontend/` for pure logic: `roles.ts` routing, token-expiry check,
  `http.ts` error mapping, refresh de-duplication.
- Manual check with the dev servers: log in as the seeded admin → `/admin`; visit
  `/field` → bounced to `/admin`; log out → `/login`; unauthenticated `/admin` → `/login`.

## Next feature: local cache (decided 2026-09-25)

Both: cached API reads for everyone (pages load instantly, show last data offline) and an
offline write queue for workers (IndexedDB, pushed to `/sync` when back online). Built as its
own spec right after this one. This design keeps it pluggable: screens call `createApi(http)`,
so a caching/queueing `Http` wraps the browser one without changing endpoint modules or pages.
