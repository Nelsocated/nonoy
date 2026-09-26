# Mang Frito — frontend

Next.js app for Mang Frito: an offline-first phone app for workers on trips, and a shared admin area for the owner and admins.

Live: https://mang-frito.up.railway.app (Railway, auto-deploys on push to `main`).

> This Next.js version has breaking changes from older ones. Read `node_modules/next/dist/docs/` before writing Next-specific code, and run `npx next typegen` after adding a dynamic route so `PageProps<"/route/[id]">` types exist.

## Stack

- Next.js (App Router) + React, TypeScript, Tailwind CSS (red and white theme, see `/theme`)
- TanStack Query (admin screens, with a persisted read cache for offline viewing)
- Dexie (IndexedDB) outbox and mirror tables for offline field work; Serwist service worker (pages cached 30 days, keyed by path without the query string, so `?id=` pages open offline)
- `jsqr` (reads a QR from an image) and `qrcode` (draws one as SVG) for payment QR codes
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
- **Field (`/field`)**: home (current trip), pickup, sale (owner's price, editable and flagged; paying by QR shows the owner's payment QR full-screen with the amount), receipt after each sale (`/field/sale/receipt?id=`, dates always in Manila time) and today's sales to reopen them (`/field/sales`), recount (blind for workers), expense, end trip, sync. Everything saves to the phone first and syncs in batches of 50 to `/sync`; the sync bar shows what's waiting. Owners and admins on a trip see the stock on the truck; workers never do. Phones keep archived buyers too, so past sales show their names, but the sale form only offers active ones.
- **Admin (`/admin`)**: dashboard (today's totals, who's out right now, problems to check, auto-refresh every minute), trip detail (`/admin/trips/[id]`) with a receipt per sale (`/admin/receipts/[clientId]`), price, QR codes (add a payment QR from a screenshot, rename, replace, remove; up to 10), buyers, plantations (delete or archive, restore), users (add, edit, reset password, activate). Every list shows 15 rows per page.
- **Info pages**: `/about`, `/help`, `/privacy`, `/terms` (route group `app/(info)`) are public, linked under the login form, in the admin menu and as the field Help tab, and cached for offline. The owner's contact lives in `components/info/contact.tsx`.
- **Dialogs**: open them with `showDialog(ref.current)` and mark the safe choice `data-autofocus`. React's `autoFocus` only writes the attribute in server HTML, so a dialog drawn in the browser would otherwise focus its first (often risky) button.

## Layout (`src/`)

| Path                                                                            |                                                                                                                                                    |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/field`, `app/admin`, `app/(auth)`                                          | pages                                                                                                                                              |
| `components/admin`, `components/trip`, `components/offline`, `components/shell` | UI                                                                                                                                                 |
| `components/receipt`, `components/qr`                                           | the receipt card and the QR drawing, shared by phone and admin                                                                                     |
| `lib/api`                                                                       | typed API client (`api.buyers.list()` …) and types mirroring the backend                                                                           |
| `lib/offline`                                                                   | Dexie db, writer (validates like the backend DTOs), sync engine, pull, caches                                                                      |
| `lib/receipt`                                                                   | receipt data and code (`MF-XXXXXXXX`), today's sales                                                                                               |
| `lib/qr`                                                                        | read a QR from an image, draw one, when "Show QR" is ready                                                                                         |
| `lib/trip`                                                                      | money (half-up to the centavo), stock, input filters                                                                                               |
| `lib/admin`                                                                     | paging (15 per page), search, problem sentences, sync age                                                                                          |
| `lib/auth`                                                                      | cookies, session, role rules                                                                                                                       |
| `lib/ui`                                                                        | `showDialog()` for dialogs; `styles.ts`: the shared red-accent classes (page title bar, card title, stat card, nav states) — use them on new pages |
