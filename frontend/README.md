# Mang Frito — frontend

Next.js app for Mang Frito: an offline-first phone app for workers on trips, and a shared admin area for the owner and admins.

Live: https://mang-frito.up.railway.app (Railway, auto-deploys on push to `main`).

> This Next.js version has breaking changes from older ones. Read `node_modules/next/dist/docs/` before writing Next-specific code, and run `npx next typegen` after adding a dynamic route so `PageProps<"/route/[id]">` types exist.

## Stack

- Next.js (App Router) + React, TypeScript, Tailwind CSS (red and white theme, see `/theme`)
- TanStack Query (admin screens, with a persisted read cache for offline viewing)
- Dexie (IndexedDB) outbox and mirror tables for offline field work; Serwist service worker (pages cached 30 days)
- Vitest, ESLint, Prettier

## Setup

```bash
npm install
cp .env.example .env.local   # API_URL and INTERNAL_PROXY_SECRET
npm run dev                  # http://localhost:3000 (the backend must run on API_URL)
```

| Variable                | What it is                                                                 |
| ----------------------- | -------------------------------------------------------------------------- |
| `API_URL`               | the Nest backend, called only from the Next server, never from the browser |
| `INTERNAL_PROXY_SECRET` | must equal the backend's; proves requests come from this server            |

Local development uses the **same database as production**, so what you record locally is real data.

## Scripts

| Command                                       |                                                   |
| --------------------------------------------- | ------------------------------------------------- |
| `npm run dev` / `npm run build` / `npm start` | develop / build / serve                           |
| `npm test`                                    | unit tests (`npx vitest run <file>` for one file) |
| `npm run lint` / `npm run format`             | ESLint / Prettier                                 |

## How it fits together

- **Auth**: login stores httpOnly cookies; `/api/*` forwards to the backend with the token. `src/proxy.ts` guards pages by role: workers → `/field`; owner and admin → `/admin`, and they may also open `/field` for their own trips.
- **Field (`/field`)**: home (current trip), pickup, sale (owner's price, editable and flagged), recount (blind for workers), expense, end trip, sync. Everything saves to the phone first and syncs in batches of 50 to `/sync`; the sync bar shows what's waiting. Owners and admins on a trip see the stock on the truck; workers never do.
- **Admin (`/admin`)**: dashboard (today's totals, who's out right now, problems to check, auto-refresh every minute), trip detail (`/admin/trips/[id]`), price, buyers, plantations (delete or archive, restore), users (add, edit, reset password, activate). Every list shows 15 rows per page.

## Layout (`src/`)

| Path                                                                            |                                                                               |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `app/field`, `app/admin`, `app/(auth)`                                          | pages                                                                         |
| `components/admin`, `components/trip`, `components/offline`, `components/shell` | UI                                                                            |
| `lib/api`                                                                       | typed API client (`api.buyers.list()` …) and types mirroring the backend      |
| `lib/offline`                                                                   | Dexie db, writer (validates like the backend DTOs), sync engine, pull, caches |
| `lib/trip`                                                                      | money (half-up to the centavo), stock, input filters                          |
| `lib/admin`                                                                     | paging (15 per page), search, problem sentences, sync age                     |
| `lib/auth`                                                                      | cookies, session, role rules                                                  |
