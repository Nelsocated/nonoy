import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '../generated/prisma/client.js';

export const PAGE_SIZE = 15;
export type ProblemKind = 'recount' | 'sale';

type OpenTripRow = {
  id: string;
  startedAt: Date;
  workerId: string;
  workerName: string;
  chicken: number;
  kilo: string;
  amount: string;
  cash: string;
  qr: string;
  lastSyncedAt: Date | null;
};

// Owner dashboard: who's out right now and the problems left to check.
@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // Trips not ended yet, with what should be left on the truck, sales so far
  // and the last time anything from the trip reached the server (the owner
  // only sees what workers' phones have synced).
  async openTrips() {
    const rows = await this.prisma.$queryRaw<OpenTripRow[]>`
      SELECT t.id, t."startedAt", u.id AS "workerId", u.name AS "workerName",
             (COALESCE(p.chicken, 0) - COALESCE(s.chicken, 0))::int AS chicken,
             (COALESCE(p.kilo, 0) - COALESCE(s.kilo, 0))::numeric(12,2)::text AS kilo,
             COALESCE(s.amount, 0)::numeric(12,2)::text AS amount,
             COALESCE(s.cash, 0)::numeric(12,2)::text AS cash,
             COALESCE(s.qr, 0)::numeric(12,2)::text AS qr,
             GREATEST(t."syncedAt", p.synced, s.synced, r.synced, e.synced) AS "lastSyncedAt"
      FROM trips t
      JOIN users u ON u.id = t."workerId"
      LEFT JOIN LATERAL (
        SELECT SUM("chickenCount") AS chicken, SUM("totalKilo") AS kilo,
               MAX("syncedAt") AS synced
        FROM pickups WHERE "tripId" = t.id
      ) p ON true
      LEFT JOIN LATERAL (
        SELECT SUM("chickenCount") AS chicken, SUM("totalKilo") AS kilo,
               SUM(amount) AS amount,
               SUM(amount) FILTER (WHERE "paymentMethod" = 'CASH') AS cash,
               SUM(amount) FILTER (WHERE "paymentMethod" = 'QR') AS qr,
               MAX("syncedAt") AS synced
        FROM sales WHERE "tripId" = t.id
      ) s ON true
      LEFT JOIN LATERAL (
        SELECT MAX("syncedAt") AS synced FROM recounts WHERE "tripId" = t.id
      ) r ON true
      LEFT JOIN LATERAL (
        SELECT MAX("syncedAt") AS synced FROM expenses WHERE "tripId" = t.id
      ) e ON true
      WHERE t."endedAt" IS NULL
      ORDER BY t."startedAt" DESC`;

    return rows.map((r) => ({
      id: r.id,
      startedAt: r.startedAt,
      worker: { id: r.workerId, name: r.workerName },
      remaining: { chicken: r.chicken, kilo: r.kilo },
      sales: { amount: r.amount, cash: r.cash, qr: r.qr },
      lastSyncedAt: r.lastSyncedAt,
    }));
  }

  // Unchecked problems, newest first, 15 per page: recounts that didn't match
  // and sales that conflicted or had their price changed by the worker.
  async problems(page = 1) {
    const offset = (page - 1) * PAGE_SIZE;
    const unchecked = Prisma.sql`
      SELECT 'recount' AS kind, id, "createdAtClient" FROM recounts
      WHERE "discrepancyFlagged" AND "checkedAt" IS NULL
      UNION ALL
      SELECT 'sale' AS kind, id, "createdAtClient" FROM sales
      WHERE "checkedAt" IS NULL AND (
        "syncStatus" = 'CONFLICT' OR (
          "pricePerKilo" IS NOT NULL AND "listPricePerKilo" IS NOT NULL
          AND "pricePerKilo" <> "listPricePerKilo"))`;
    const [refs, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<{ kind: ProblemKind; id: string }[]>`
        SELECT kind, id FROM (${unchecked}) p
        ORDER BY "createdAtClient" DESC, id
        LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total FROM (${unchecked}) p`,
    ]);

    const ids = (kind: ProblemKind) =>
      refs.filter((r) => r.kind === kind).map((r) => r.id);
    const trip = {
      select: { id: true, worker: { select: { id: true, name: true } } },
    };
    const [recounts, sales] = await Promise.all([
      this.prisma.recount.findMany({
        where: { id: { in: ids('recount') } },
        include: { trip },
      }),
      this.prisma.sale.findMany({
        where: { id: { in: ids('sale') } },
        include: { trip, buyer: { select: { id: true, name: true } } },
      }),
    ]);

    const recountItems = recounts.map(({ trip: t, ...r }) => ({
      kind: 'recount' as const,
      ...r,
      worker: t.worker,
      // counted − expected: negative = short, positive = over
      chickenDifference: r.countedChicken - r.expectedChicken,
      kiloDifference: r.countedKilo.minus(r.expectedKilo).toFixed(2),
    }));
    const saleItems = sales.map(({ trip: t, ...s }) => ({
      kind: 'sale' as const,
      ...s,
      worker: t.worker,
    }));
    const byId = new Map(
      [...recountItems, ...saleItems].map((i) => [`${i.kind}:${i.id}`, i]),
    );

    return {
      // keep the SQL order; a row checked meanwhile simply drops out
      items: refs.flatMap((r) => byId.get(`${r.kind}:${r.id}`) ?? []),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  // Owner/admin looked at it. The first checker is kept if two check at once.
  // Only rows the problems list would show can be checked.
  async checkProblem(
    kind: ProblemKind,
    id: string,
    note: string | undefined,
    userId: string,
  ) {
    const find = () =>
      kind === 'recount'
        ? this.prisma.recount.findUnique({ where: { id } })
        : this.prisma.sale.findUnique({ where: { id } });
    const before = await find();
    if (!before || !isProblem(kind, before))
      throw new NotFoundException('Problem not found');

    const data = {
      checkedAt: new Date(),
      checkedById: userId,
      checkNote: note || null,
    };
    // only an unchecked row is written, so two owners checking at once
    // can't overwrite each other; then return whatever is stored
    const where = { id, checkedAt: null };
    if (kind === 'recount')
      await this.prisma.recount.updateMany({ where, data });
    else await this.prisma.sale.updateMany({ where, data });
    return (await find()) ?? before;
  }
}

// same rule as the problems query: a flagged recount, or a sale that
// conflicted or had its price changed
type ProblemRow = {
  discrepancyFlagged?: boolean;
  syncStatus?: string;
  pricePerKilo?: Decimal | null;
  listPricePerKilo?: Decimal | null;
};
function isProblem(kind: ProblemKind, row: ProblemRow) {
  if (kind === 'recount') return row.discrepancyFlagged === true;
  return (
    row.syncStatus === 'CONFLICT' ||
    (row.pricePerKilo != null &&
      row.listPricePerKilo != null &&
      !row.pricePerKilo.equals(row.listPricePerKilo))
  );
}
