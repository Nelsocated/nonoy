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

| Module                                              | Endpoints (roles)                                                                                                                                                                                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`                                              | login, refresh (10 s grace window), logout                                                                                                                                                                                                         |
| `users`                                             | `POST /users/register` (public, worker), `POST /users`, `GET /users`, `PATCH /users/:id`, `PATCH /users/:id/password` (logs them out), `PATCH /users/:id/active` — owner and admin have the same powers; nobody can deactivate or reset themselves |
| `buyers`, `plantations`                             | list (active only; `?include=archived` for the admin screen), create, update, `DELETE` = delete if unused / archive if it has sales or pickups, `PATCH /:id/restore`                                                                               |
| `prices`                                            | `GET /prices/current` (any role), history and set (owner/admin)                                                                                                                                                                                    |
| `trips`, `pickups`, `sales`, `recounts`, `expenses` | field records; each has an offline `clientId` for idempotent retries                                                                                                                                                                               |
| `sync`                                              | `POST /sync` — a phone's queued records in one batch: trips (and endings) first, then pickups/sales/expenses, recounts, last trip endings. One bad item doesn't block the rest; database outages fail the whole request (5xx) so the phone retries |
| `reports`                                           | `daily`, `workers`, `discrepancies`, `trips/:id`, and for the owner dashboard `open-trips`, `problems?page=` (15 per page) and `PATCH problems/:kind/:id/check`                                                                                    |
| `activity-logs`                                     | an append-only log of worker actions                                                                                                                                                                                                               |

## Rules worth knowing

- **Amounts**: `Decimal(10, 2)`; sale amount = kilos × price, rounded half-up to the centavo, checked against what the phone sent.
- **Recounts are blind** for workers: the server computes expected stock from pickups and sales recorded up to the recount and flags a mismatch.
- **Problems** (dashboard): flagged recounts, conflicted sales (made after their trip ended), and sales where the worker changed the owner's price. Owner/admin mark them as checked, with an optional note.
