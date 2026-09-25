import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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
}
