import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { Role } from '../generated/prisma/enums.js';
import { TripAccessService } from '../trips/trips-access.service.js';
import type { AuthenticatedUser } from '../auth/auth.controller.js';
import { DailyReportDto, ReportRangeDto } from './reports.dto.js';

const MAX_RANGE_DAYS = 366;

// Money/kilo sums come back from SQL as text and are added up with Decimal,
// never JS floats, so totals match the DB to the centavo.
type Sums = { chicken: number; kilo: string };
type SaleSums = Sums & {
  count: number;
  amount: string;
  cash: string;
  qr: string;
  conflicts: number;
};
type ExpenseSums = { count: number; amount: string };

const zeroSums = (): Sums => ({ chicken: 0, kilo: '0' });
const zeroSales = (): SaleSums => ({
  ...zeroSums(),
  count: 0,
  amount: '0',
  cash: '0',
  qr: '0',
  conflicts: 0,
});
const zeroExpenses = (): ExpenseSums => ({ count: 0, amount: '0' });
const minus = (a: string, b: string) => new Decimal(a).minus(b).toFixed(2);

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private tripAccessService: TripAccessService,
  ) {}

  private get timezone() {
    return process.env.REPORT_TIMEZONE ?? 'Asia/Manila';
  }

  /**
   * Turns calendar days in the report timezone into a UTC [start, end) window.
   * Postgres does the zone math so DST/offsets are always right.
   */
  async resolveRange(dto: ReportRangeDto) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
    }).format(new Date()); // en-CA formats as YYYY-MM-DD
    const to = dto.to ?? today;
    const from =
      dto.from ??
      new Date(Date.parse(to) - 6 * 86_400_000).toISOString().slice(0, 10);

    const days = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
    if (Number.isNaN(days)) throw new BadRequestException('Invalid date');
    if (days < 1) throw new BadRequestException('from must be on or before to');
    if (days > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Range can be at most ${MAX_RANGE_DAYS} days`);
    }

    // ::text + 'Z' so the pg driver can't reinterpret the timestamp in server-local time
    const [row] = await this.prisma.$queryRaw<{ start: string; end: string }[]>`
      SELECT
        ((${from}::date)::timestamp AT TIME ZONE ${this.timezone} AT TIME ZONE 'UTC')::text AS start,
        ((${to}::date + 1)::timestamp AT TIME ZONE ${this.timezone} AT TIME ZONE 'UTC')::text AS "end"`;

    return {
      from,
      to,
      timezone: this.timezone,
      start: new Date(row.start + 'Z'),
      end: new Date(row.end + 'Z'),
    };
  }

  // calendar day (in report tz) of a UTC-stored timestamp column
  private day(column: Prisma.Sql) {
    return Prisma.sql`((${column} AT TIME ZONE 'UTC') AT TIME ZONE ${this.timezone})::date::text`;
  }

  async daily(dto: DailyReportDto) {
    const range = await this.resolveRange(dto);
    const { start, end } = range;
    const byWorker = (col: Prisma.Sql) =>
      dto.workerId ? Prisma.sql`AND ${col} = ${dto.workerId}` : Prisma.empty;

    const [pickups, sales, expenses] = await Promise.all([
      this.prisma.$queryRaw<(Sums & { day: string })[]>`
        SELECT ${this.day(Prisma.sql`p."createdAtClient"`)} AS day,
               COALESCE(SUM(p."chickenCount"), 0)::int AS chicken,
               COALESCE(SUM(p."totalKilo"), 0)::text AS kilo
        FROM pickups p JOIN trips t ON t.id = p."tripId"
        WHERE p."createdAtClient" >= ${start} AND p."createdAtClient" < ${end}
          ${byWorker(Prisma.sql`t."workerId"`)}
        GROUP BY 1`,
      this.prisma.$queryRaw<(SaleSums & { day: string })[]>`
        SELECT ${this.day(Prisma.sql`s."createdAtClient"`)} AS day,
               COUNT(*)::int AS count,
               COALESCE(SUM(s."chickenCount"), 0)::int AS chicken,
               COALESCE(SUM(s."totalKilo"), 0)::text AS kilo,
               COALESCE(SUM(s.amount), 0)::text AS amount,
               COALESCE(SUM(s.amount) FILTER (WHERE s."paymentMethod" = 'CASH'), 0)::text AS cash,
               COALESCE(SUM(s.amount) FILTER (WHERE s."paymentMethod" = 'QR'), 0)::text AS qr,
               (COUNT(*) FILTER (WHERE s."syncStatus" = 'CONFLICT'))::int AS conflicts
        FROM sales s JOIN trips t ON t.id = s."tripId"
        WHERE s."createdAtClient" >= ${start} AND s."createdAtClient" < ${end}
          ${byWorker(Prisma.sql`t."workerId"`)}
        GROUP BY 1`,
      this.prisma.$queryRaw<(ExpenseSums & { day: string })[]>`
        SELECT ${this.day(Prisma.sql`e."createdAtClient"`)} AS day,
               COUNT(*)::int AS count,
               COALESCE(SUM(e.amount), 0)::text AS amount
        FROM expenses e
        WHERE e."createdAtClient" >= ${start} AND e."createdAtClient" < ${end}
          ${byWorker(Prisma.sql`e."workerId"`)}
        GROUP BY 1`,
    ]);

    // one row per calendar day in range, including days with no activity
    const rows = [];
    for (
      let d = Date.parse(range.from);
      d <= Date.parse(range.to);
      d += 86_400_000
    ) {
      const day = new Date(d).toISOString().slice(0, 10);
      const { day: _p, ...p } = pickups.find((r) => r.day === day) ?? { day, ...zeroSums() };
      const { day: _s, ...s } = sales.find((r) => r.day === day) ?? { day, ...zeroSales() };
      const { day: _e, ...e } = expenses.find((r) => r.day === day) ?? { day, ...zeroExpenses() };
      rows.push({
        day,
        pickups: p,
        sales: s,
        expenses: e,
        net: minus(s.amount, e.amount),
      });
    }

    return { ...this.rangeInfo(range), workerId: dto.workerId ?? null, days: rows };
  }

  async byWorker(dto: ReportRangeDto) {
    const range = await this.resolveRange(dto);
    const { start, end } = range;

    const [trips, pickups, sales, expenses, flagged, workers] = await Promise.all([
      this.prisma.$queryRaw<{ workerId: string; count: number }[]>`
        SELECT "workerId", COUNT(*)::int AS count FROM trips
        WHERE "startedAt" >= ${start} AND "startedAt" < ${end}
        GROUP BY 1`,
      this.prisma.$queryRaw<(Sums & { workerId: string })[]>`
        SELECT t."workerId",
               COALESCE(SUM(p."chickenCount"), 0)::int AS chicken,
               COALESCE(SUM(p."totalKilo"), 0)::text AS kilo
        FROM pickups p JOIN trips t ON t.id = p."tripId"
        WHERE p."createdAtClient" >= ${start} AND p."createdAtClient" < ${end}
        GROUP BY 1`,
      this.prisma.$queryRaw<(SaleSums & { workerId: string })[]>`
        SELECT t."workerId",
               COUNT(*)::int AS count,
               COALESCE(SUM(s."chickenCount"), 0)::int AS chicken,
               COALESCE(SUM(s."totalKilo"), 0)::text AS kilo,
               COALESCE(SUM(s.amount), 0)::text AS amount,
               COALESCE(SUM(s.amount) FILTER (WHERE s."paymentMethod" = 'CASH'), 0)::text AS cash,
               COALESCE(SUM(s.amount) FILTER (WHERE s."paymentMethod" = 'QR'), 0)::text AS qr,
               (COUNT(*) FILTER (WHERE s."syncStatus" = 'CONFLICT'))::int AS conflicts
        FROM sales s JOIN trips t ON t.id = s."tripId"
        WHERE s."createdAtClient" >= ${start} AND s."createdAtClient" < ${end}
        GROUP BY 1`,
      this.prisma.$queryRaw<(ExpenseSums & { workerId: string })[]>`
        SELECT "workerId", COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::text AS amount
        FROM expenses
        WHERE "createdAtClient" >= ${start} AND "createdAtClient" < ${end}
        GROUP BY 1`,
      this.prisma.$queryRaw<{ workerId: string; count: number }[]>`
        SELECT t."workerId", COUNT(*)::int AS count
        FROM recounts r JOIN trips t ON t.id = r."tripId"
        WHERE r."discrepancyFlagged" AND r."createdAtClient" >= ${start} AND r."createdAtClient" < ${end}
        GROUP BY 1`,
      this.prisma.user.findMany({
        where: { role: Role.WORKER },
        select: { id: true, name: true, isActive: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // every worker is listed (zeros if idle); anyone else with activity is appended
    const ids = new Set(workers.map((w) => w.id));
    for (const r of [...trips, ...pickups, ...sales, ...expenses]) ids.add(r.workerId);
    const extra = await this.prisma.user.findMany({
      where: { id: { in: [...ids].filter((id) => !workers.some((w) => w.id === id)) } },
      select: { id: true, name: true, isActive: true },
    });

    const pick = <T extends { workerId: string }>(rows: T[], id: string) => {
      const row = rows.find((r) => r.workerId === id);
      if (!row) return undefined;
      const { workerId: _, ...rest } = row;
      return rest;
    };

    return {
      ...this.rangeInfo(range),
      workers: [...workers, ...extra].map((w) => {
        const s = pick(sales, w.id) ?? zeroSales();
        const e = pick(expenses, w.id) ?? zeroExpenses();
        return {
          worker: w,
          trips: pick(trips, w.id)?.count ?? 0,
          pickups: pick(pickups, w.id) ?? zeroSums(),
          sales: s,
          expenses: e,
          net: minus(s.amount, e.amount),
          flaggedRecounts: pick(flagged, w.id)?.count ?? 0,
        };
      }),
    };
  }

  async discrepancies(dto: ReportRangeDto) {
    const range = await this.resolveRange(dto);
    const when = { gte: range.start, lt: range.end };
    const trip = {
      select: {
        id: true,
        startedAt: true,
        worker: { select: { id: true, name: true } },
      },
    };

    const [recounts, conflictedSales] = await Promise.all([
      this.prisma.recount.findMany({
        where: { discrepancyFlagged: true, createdAtClient: when },
        include: { trip },
        orderBy: { createdAtClient: 'desc' },
      }),
      this.prisma.sale.findMany({
        where: { syncStatus: 'CONFLICT', createdAtClient: when },
        include: { trip, buyer: { select: { id: true, name: true } } },
        orderBy: { createdAtClient: 'desc' },
      }),
    ]);

    return {
      ...this.rangeInfo(range),
      // positive difference = more on hand than expected, negative = missing
      recounts: recounts.map((r) => ({
        ...r,
        chickenDifference: r.countedChicken - r.expectedChicken,
        kiloDifference: r.countedKilo.minus(r.expectedKilo).toFixed(2),
      })),
      conflictedSales,
    };
  }

  // OWNER/ADMIN can open any trip; a worker only their own
  async tripDetail(tripId: string, user: AuthenticatedUser) {
    if (user.role === Role.WORKER) {
      await this.tripAccessService.assertOwnership(tripId, user.id);
    }

    const byTime = { orderBy: { createdAtClient: 'asc' as const } };
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        worker: { select: { id: true, name: true } },
        pickups: { ...byTime, include: { plantation: { select: { id: true, name: true } } } },
        sales: { ...byTime, include: { buyer: { select: { id: true, name: true } } } },
        recounts: byTime,
        expenses: byTime,
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    const sum = <T>(rows: T[], f: (r: T) => Decimal | number) =>
      rows.reduce((acc, r) => acc.plus(f(r)), new Decimal(0));
    const picked = { chicken: sum(trip.pickups, (p) => p.chickenCount), kilo: sum(trip.pickups, (p) => p.totalKilo) };
    const sold = { chicken: sum(trip.sales, (s) => s.chickenCount), kilo: sum(trip.sales, (s) => s.totalKilo) };
    const salesAmount = sum(trip.sales, (s) => s.amount);
    const expenses = sum(trip.expenses, (e) => e.amount);

    return {
      ...trip,
      totals: {
        pickedUp: { chicken: picked.chicken.toNumber(), kilo: picked.kilo.toFixed(2) },
        sold: { chicken: sold.chicken.toNumber(), kilo: sold.kilo.toFixed(2) },
        // what should still be on the truck right now
        remaining: {
          chicken: picked.chicken.minus(sold.chicken).toNumber(),
          kilo: picked.kilo.minus(sold.kilo).toFixed(2),
        },
        sales: {
          amount: salesAmount.toFixed(2),
          cash: sum(trip.sales, (s) => (s.paymentMethod === 'CASH' ? s.amount : 0)).toFixed(2),
          qr: sum(trip.sales, (s) => (s.paymentMethod === 'QR' ? s.amount : 0)).toFixed(2),
        },
        expenses: expenses.toFixed(2),
        net: salesAmount.minus(expenses).toFixed(2),
      },
    };
  }

  private rangeInfo(r: { from: string; to: string; timezone: string }) {
    return { from: r.from, to: r.to, timezone: r.timezone };
  }
}
