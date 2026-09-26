# Mang Frito — backend

NestJS API for Mang Frito, a live-chicken trading business. Workers record trips on their phones (offline first); the owner and admins manage prices, buyers, plantations and users, and watch the dashboard.

Live: the API runs privately on Railway (project `keen-contentment`, Singapore) and is only reached through the frontend's `/api/*` forwarder. Pushing to `main` deploys.

## Stack

- NestJS 11, TypeScript, class-validator DTOs (global `ValidationPipe`, whitelist)
- Prisma 7 with the `@prisma/adapter-pg` driver adapter, PostgreSQL. The client is generated into `src/generated/prisma` (not committed)
- JWT auth (access + refresh in httpOnly cookies set by the frontend), roles `WORKER`, `OWNER`, `ADMIN`
- Vitest for tests, oxlint, Prettier

## Setup

```bash
npm install
cp .env.example .env         # fill it in (see below)
npx prisma generate --config prisma7.config.ts
npm run start:dev            # http://localhost:4000
```

> **One database for everything.** Local development points at the same Postgres as production, so anything you create locally is real data. Apply migrations with `npx prisma migrate deploy --config prisma7.config.ts`. Never use `migrate dev` or `migrate reset`: they can wipe the shared database.

### Environment

| Variable                                                     | What it is                                                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                               | Postgres connection string                                                                                 |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`                    | signing secrets                                                                                            |
| `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`                    | e.g. `15m`, `30d`                                                                                          |
| `INTERNAL_PROXY_SECRET`                                      | shared with the frontend; lets the API trust `X-Forwarded-For` from the Next server (per-user rate limits) |
| `PORT`                                                       | `4000` in `.env.example` (the frontend's `API_URL` expects it); 3000 if unset                              |
| `FRONTEND_URL`                                               | CORS origin                                                                                                |
| `REPORT_TIMEZONE`                                            | calendar days for reports, default `Asia/Manila`                                                           |
| `SEED_ADMIN_PHONE`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | first admin, created by `npm run seed` (after `npm run build`)                                             |

## Scripts

| Command                                |                                                           |
| -------------------------------------- | --------------------------------------------------------- |
| `npm run start:dev`                    | watch mode                                                |
| `npm run build` / `npm run start:prod` | production build / run                                    |
| `npm test`                             | unit tests (`npx vitest run src/<module>` for one module) |
| `npm run test:e2e`                     | boots the whole app (needs `.env`)                        |
| `npm run lint` / `npm run format`      | oxlint / Prettier                                         |

## Modules (`src/`)

| Module                                              | Endpoints (roles)                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`                                              | login, refresh (10 s grace window), logout                                                                                                                                                                                                                                                                                                                                                                                  |
| `users`                                             | `POST /users`, `GET /users`, `PATCH /users/:id`, `PATCH /users/:id/password` (logs them out), `PATCH /users/:id/active` — admins manage everyone; the owner manages owners and workers and never sees admin accounts (they answer "not found"); no public sign-up; nobody can deactivate or reset themselves. Passwords 6 characters to 72 bytes (bcrypt's limit)                                                           |
| `buyers`, `plantations`                             | list (active only; `?include=archived` adds removed ones — the admin screen, and phones so past sales keep buyer names), create, update, `DELETE` = delete if unused / archive if it has sales or pickups, or a new-buyer request points at it (row locked while deciding), `PATCH /:id/restore`                                                                                                                            |
| `buyer-requests`                                    | new buyers typed by workers on a sale, sent through `/sync` before their sales. `GET /buyer-requests` (pending, owner/admin), `GET /buyer-requests/mine` (a phone's own, pending or decided in the last 60 days), `POST /:id/approve` (makes the buyer), `/:id/merge` (same as an active buyer; that buyer row is locked too), `/:id/reject` (sales stay walk-in) — each decision moves its sales in one locked transaction |
| `prices`                                            | `GET /prices/current` (any role), history and set (owner/admin)                                                                                                                                                                                                                                                                                                                                                             |
| `payment-qrs`                                       | `GET /payment-qrs` (any role, phones keep them offline), `POST`, `PATCH /:id`, `DELETE /:id` (owner/admin). Stores only the text inside each payment QR (label ≤ 40, payload ≤ 1000), up to 10                                                                                                                                                                                                                              |
| `trips`, `pickups`, `sales`, `recounts`, `expenses` | field records; each has an offline `clientId` for idempotent retries. `GET /sales/:clientId/receipt` (owner/admin) returns one sale's receipt with buyer and worker names                                                                                                                                                                                                                                                   |
| `sync`                                              | `POST /sync` — a phone's queued records in one batch: trips (and endings) first, then pickups/sales/expenses, recounts, last trip endings. One bad item doesn't block the rest; database outages fail the whole request (5xx) so the phone retries                                                                                                                                                                          |
| `reports`                                           | `daily`, `workers`, `discrepancies`, `trips/:id`, and for the owner dashboard `open-trips`, `problems?page=` (15 per page, page ≤ 10000), `trips?month=&workerId=&page=` (every trip in a month, 15 per page, with totals and unchecked problems) and `PATCH problems/:kind/:id/check` (only rows the problems list would show; workers' own trip detail leaves out the check notes)                                        |
| `activity-logs`                                     | an append-only log of worker actions                                                                                                                                                                                                                                                                                                                                                                                        |

## Rules worth knowing

- **Amounts**: `Decimal(10, 2)`; sale amount = kilos × price, rounded half-up to the centavo, checked against what the phone sent.
- **Recounts are blind** for workers: the server computes expected stock from pickups and sales recorded up to the recount and flags a mismatch.
- **Receipts** are identified by `MF-` + the first 8 characters of the sale's `clientId` (made on the phone, so the phone and the admin screen agree offline). The code is a reference, not a lookup key.
- **Payment QR codes** are kept as the QR's text, not an image; the admin screen reads it from a screenshot and phones redraw it.
- **PATCH bodies** use `@IfSent()` (`src/common`) instead of `@IsOptional()` for required columns, so a left-out field is skipped but `null` is rejected with a 400.
- **Problems** (dashboard): flagged recounts, conflicted sales (made after their trip ended), and sales where the worker changed the owner's price. Owner/admin mark them as checked, with an optional note.
