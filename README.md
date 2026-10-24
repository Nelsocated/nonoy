# Mang Frito

One Next.js app for Mang Frito, a live-chicken trading business: an offline-first phone app for workers on trips, a shared admin area for the owner and admins, and the server code behind both (tRPC + Prisma), in the same project.

Live: https://mangfrito.nimbras.com (Vercel, region `sin1`, auto-deploys on push to `main`). The database is Postgres on Railway (project `keen-contentment`, Singapore); nothing else runs there.

> This Next.js version has breaking changes from older ones. Read `node_modules/next/dist/docs/` before writing Next-specific code, and run `npx next typegen` after adding a dynamic route so `PageProps<"/route/[id]">` types exist.

## Stack

- Next.js (App Router) + React, TypeScript, Tailwind CSS (red and white theme, see `/theme`)
- tRPC 11 (`src/server/routers`, one router per area) with zod input checks; screens get their types from the routers, so there are no hand-copied API types
- Prisma 7 with the `@prisma/adapter-pg` driver adapter, PostgreSQL; the client is generated into `src/server/generated/prisma` (not committed, `postinstall` runs `prisma generate`)
- TanStack Query (admin screens, with a persisted read cache for offline viewing)
- Dexie (IndexedDB) outbox and mirror tables for offline field work; Serwist service worker (pages cached 30 days, keyed by path without the query string, so `?id=` pages open offline)
- `jsqr` (reads a QR from an image) and `qrcode` (draws one as SVG) for payment QR codes
- Vitest, ESLint, Prettier

## Setup

```bash
npm install                  # also generates the Prisma client
cp .env.example .env         # fill it in (see below)
npm run dev                  # http://localhost:3000
```

| Variable                                                     | What it is                                                                                                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                               | Postgres connection string (on Vercel: Railway's public URL with `?sslmode=no-verify`: encrypted, and accepts Railway's self-signed certificate (`require` would reject it)) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`                    | signing secrets                                                                                                                                                              |
| `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`                    | e.g. `15m`, `30d`                                                                                                                                                            |
| `REPORT_TIMEZONE`                                            | calendar days for reports, default `Asia/Manila`                                                                                                                             |
| `SEED_ADMIN_PHONE`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | first admin, created by `npm run seed`                                                                                                                                       |

> **One database for everything.** Local development uses the **same database as production**, so what you record locally is real data. Never run `prisma migrate dev` or `migrate reset`: they can wipe it. Migrations are applied by production deploys only (`scripts/migrate-if-production.mjs` runs `prisma migrate deploy` when `VERCEL_ENV=production`); preview builds never touch the schema.

## Scripts

| Command                                       |                                                       |
| --------------------------------------------- | ----------------------------------------------------- |
| `npm run dev` / `npm run build` / `npm start` | develop / build (migrates on production only) / serve |
| `npm run seed`                                | create the first admin (safe to re-run)               |
| `npm test`                                    | unit tests (`npx vitest run <file>` for one file)     |
| `npm run lint` / `npm run format`             | ESLint / Prettier                                     |

## How it fits together

- **Server**: `src/server` holds everything that touches the database: `services/` (business rules, ported from the old Nest backend), `schemas/` (zod inputs; messages kept word for word), `routers/` (who may call what: `authedProcedure` = any signed-in user, `adminProcedure` = owner or admin), `auth/` and `rate-limit.ts`. Browsers call `/api/trpc/*` through `lib/trpc/browser.ts`; every failure reaches the screen as `ApiError(status, message)`.
- **Auth**: phone + password login (a server action) stores httpOnly cookies: a 15-minute access token and a 30-day refresh token that rotates on use (a 10 s grace window covers two requests refreshing at once). Login is limited to 5 tries a minute per IP, counted in the `login_attempts` table. `src/proxy.ts` guards pages by role: workers → `/field`; owner and admin → `/admin`, and they may also open `/field` for their own trips.
- **Field (`/field`)**: home (current trip), pickup, sale (owner's price, editable and flagged; paying by QR shows the owner's payment QR full-screen with the amount), receipt after each sale (`/field/sale/receipt?id=`, dates always in Manila time) and today's sales to reopen them (`/field/sales`), recount (blind for workers), expense, end trip, sync. Everything saves to the phone first and syncs in batches of 50 to `sync.push`; the sync bar shows what's waiting. Owners and admins on a trip see the stock on the truck; workers never do. Phones keep archived buyers too, so past sales show their names, but the sale form only offers active ones.
- **Admin (`/admin`)**: dashboard (today's totals, who's out right now, problems to check, auto-refresh every minute), trip detail (`/admin/trips/[id]`) with a receipt per sale (`/admin/receipts/[clientId]`), Trips (`/admin/trips?month=&worker=&page=`: every trip in a month, rows open in place to show their records), Reports (`/admin/reports?month=YYYY-MM`: month totals + day by day, printable via the browser; print styles in `globals.css`), price, QR codes (add a payment QR from a screenshot, rename, replace, remove; up to 10), buyers, plantations (delete or archive, restore), users (add, edit, reset password, activate). Every list shows 15 rows per page.
- **Info pages**: `/about`, `/help`, `/privacy`, `/terms` (route group `app/(info)`) are public, linked under the login form, in the admin menu and as the field Help tab, and cached for offline. The owner's contact lives in `components/info/contact.tsx`.
- **Dropdowns**: use `Select` (`components/select.tsx`), not a native `<select>`. It matches the theme, works like a native select from the keyboard (arrows, Home/End, Enter, Esc, type a letter), and opens its list in the top layer so dialogs don't clip it; it flips upward when there's no room below. `size="lg"` for the big field-form inputs.
- **Admin menu**: the sidebar (and the phone slide-in menu) scrolls between the logo and the account bar, which stays pinned at the bottom.
- **Scrollbars**: thin and red everywhere, set once in `globals.css` (`scrollbar-color` for Chrome/Firefox, `::-webkit-scrollbar` for Safari).
- **New buyers on phones**: "(waiting)" comes from `waitingLabel` (`lib/trip/buyer-name.ts`), shared with the admin screens. A pull drops a waiting request the server no longer sends (decided more than 60 days ago). Forms show the `lib/offline/validate.ts` rules under their fields with `problem()`.
- **Dialogs**: open them with `showDialog(ref.current)` and mark the safe choice `data-autofocus`. React's `autoFocus` only writes the attribute in server HTML, so a dialog drawn in the browser would otherwise focus its first (often risky) button.

## Layout (`src/`)

| Path                                                                            |                                                                                                                                                    |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/field`, `app/admin`, `app/(auth)`                                          | pages                                                                                                                                              |
| `components/admin`, `components/trip`, `components/offline`, `components/shell` | UI                                                                                                                                                 |
| `components/receipt`, `components/qr`                                           | the receipt card and the QR drawing, shared by phone and admin                                                                                     |
| `server`                                                                        | services, zod schemas, tRPC routers, auth, the Prisma client (`db.ts`, a pool of 3 per instance)                                                   |
| `lib/trpc`                                                                      | the browser client (`trpc.buyers.list.query()` …), `ApiError`, and the types screens use, read off the routers                                     |
| `lib/offline`                                                                   | Dexie db, writer (validates like the server schemas), sync engine, pull, caches                                                                    |
| `lib/receipt`                                                                   | receipt data and code (`MF-XXXXXXXX`), today's sales                                                                                               |
| `lib/qr`                                                                        | read a QR from an image, draw one, when "Show QR" is ready                                                                                         |
| `lib/trip`                                                                      | money (half-up to the centavo), stock, input filters                                                                                               |
| `lib/admin`                                                                     | paging (15 per page), search, problem sentences, sync age                                                                                          |
| `lib/auth`                                                                      | cookies, session, role rules                                                                                                                       |
| `lib/ui`                                                                        | `showDialog()` for dialogs; `styles.ts`: the shared red-accent classes (page title bar, card title, stat card, nav states) — use them on new pages |

## Rules worth knowing (server)

- **Amounts**: `Decimal(10, 2)`; sale amount = kilos × price, rounded half-up to the centavo, checked against what the phone sent. Decimals and dates travel as strings, and the inferred types say so.
- **Sync**: one batch holds a phone's queued records: buyer requests, trips (and endings) first, then pickups/sales/expenses, recounts, last trip endings. One bad item doesn't block the rest; database outages fail the whole request (5xx) so the phone retries. A queue from a different user than the signed-in one is refused (401, `x-offline-user`).
- **Recounts are blind** for workers: the server computes expected stock from pickups and sales recorded up to the recount and flags a mismatch.
- **Users**: admins manage everyone; the owner manages owners and workers and never sees admin accounts (they answer "not found"); nobody can deactivate or reset themselves. Passwords 6 characters to 72 bytes (bcrypt's limit).
- **Buyers and plantations**: removing one deletes it if unused, archives it if it has history (or a new-buyer request decided in the last 60 days points at it).
- **PATCH inputs**: a left-out field is skipped; `null` on a required column is rejected with a 400.
- **Problems** (dashboard): flagged recounts, conflicted sales (made after their trip ended), and sales where the worker changed the owner's price. Owner/admin mark them as checked, with an optional note.
