import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('DashboardService', () => {
  let service: DashboardService;
  const prisma = {
    $queryRaw: vi.fn(),
    recount: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    sale: { findMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(DashboardService);
  });

  describe('openTrips', () => {
    it('nests worker, stock left, sales so far and last sync', async () => {
      const startedAt = new Date('2026-09-26T22:10:00Z');
      const lastSyncedAt = new Date('2026-09-27T01:00:00Z');
      prisma.$queryRaw.mockResolvedValue([
        {
          id: 't1',
          startedAt,
          workerId: 'w1',
          workerName: 'Juan',
          chicken: -2, // over-sold: shown as-is to the owner
          kilo: '-1.50',
          amount: '900.00',
          cash: '600.00',
          qr: '300.00',
          lastSyncedAt,
        },
      ]);
      await expect(service.openTrips()).resolves.toEqual([
        {
          id: 't1',
          startedAt,
          worker: { id: 'w1', name: 'Juan' },
          remaining: { chicken: -2, kilo: '-1.50' },
          sales: { amount: '900.00', cash: '600.00', qr: '300.00' },
          lastSyncedAt,
        },
      ]);
    });
  });

  describe('problems', () => {
    const worker = { id: 'w1', name: 'Juan' };
    const at = (h: number) => new Date(`2026-09-26T0${h}:00:00Z`);

    it('pages 15 at a time, newest first, merged across recounts and sales', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([
          { kind: 'sale', id: 's1' },
          { kind: 'recount', id: 'r1' },
        ])
        .mockResolvedValueOnce([{ total: 17 }]);
      prisma.recount.findMany.mockResolvedValue([
        {
          id: 'r1',
          tripId: 't1',
          createdAtClient: at(1),
          countedChicken: 7,
          expectedChicken: 10,
          countedKilo: new Decimal('15.50'),
          expectedKilo: new Decimal('20.00'),
          trip: { worker },
        },
      ]);
      prisma.sale.findMany.mockResolvedValue([
        { id: 's1', tripId: 't1', createdAtClient: at(2), trip: { worker } },
      ]);

      const r = await service.problems(2);

      // page 2 → skip the first 15
      const sql = prisma.$queryRaw.mock.calls[0];
      expect(sql.slice(1)).toContain(15);
      expect(r).toMatchObject({ total: 17, page: 2, pageSize: 15 });
      expect(r.items.map((i) => `${i.kind}:${i.id}`)).toEqual([
        'sale:s1',
        'recount:r1',
      ]);
      expect(r.items[1]).toMatchObject({
        worker,
        chickenDifference: -3,
        kiloDifference: '-4.50',
      });
    });

    it('a page past the end is empty but keeps the total', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 4 }]);
      prisma.recount.findMany.mockResolvedValue([]);
      prisma.sale.findMany.mockResolvedValue([]);
      await expect(service.problems(99)).resolves.toMatchObject({
        items: [],
        total: 4,
      });
    });
  });

  describe('checkProblem', () => {
    const flagged = { id: 'r1', discrepancyFlagged: true, checkedAt: null };
    const conflict = { id: 's1', syncStatus: 'CONFLICT', checkedAt: null };

    it('404s for an unknown problem', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);
      await expect(
        service.checkProblem('sale', 'x', undefined, 'me'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.sale.updateMany).not.toHaveBeenCalled();
    });

    // only what the problems list shows can be marked checked
    it('404s for a recount that matched or a normal sale', async () => {
      prisma.recount.findUnique.mockResolvedValue({
        id: 'r2',
        discrepancyFlagged: false,
      });
      await expect(
        service.checkProblem('recount', 'r2', undefined, 'me'),
      ).rejects.toThrow(NotFoundException);
      prisma.sale.findUnique.mockResolvedValue({
        id: 's2',
        syncStatus: 'SYNCED',
        pricePerKilo: new Decimal('180'),
        listPricePerKilo: new Decimal('180.00'),
      });
      await expect(
        service.checkProblem('sale', 's2', undefined, 'me'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.recount.updateMany).not.toHaveBeenCalled();
      expect(prisma.sale.updateMany).not.toHaveBeenCalled();
    });

    it('accepts a sale whose price was changed', async () => {
      const sale = {
        id: 's3',
        syncStatus: 'SYNCED',
        pricePerKilo: new Decimal('175'),
        listPricePerKilo: new Decimal('180'),
      };
      prisma.sale.findUnique.mockResolvedValue(sale);
      prisma.sale.updateMany.mockResolvedValue({ count: 1 });
      await expect(
        service.checkProblem('sale', 's3', undefined, 'me'),
      ).resolves.toBe(sale);
      expect(prisma.sale.updateMany).toHaveBeenCalled();
    });

    // two owners pressing Checked together: only an unchecked row is written,
    // so the first checker's name and note stay
    it('only writes a row that is still unchecked (first checker kept)', async () => {
      const row = { ...flagged, checkedAt: new Date(), checkedById: 'other' };
      prisma.recount.updateMany.mockResolvedValue({ count: 0 });
      prisma.recount.findUnique.mockResolvedValue(row);
      await expect(
        service.checkProblem('recount', 'r1', 'late', 'me'),
      ).resolves.toBe(row);
      expect(prisma.recount.updateMany).toHaveBeenCalledWith({
        where: { id: 'r1', checkedAt: null },
        data: expect.objectContaining({ checkedById: 'me' }),
      });
    });

    it('records who checked it, when, and the note (empty → none)', async () => {
      prisma.sale.updateMany.mockResolvedValue({ count: 1 });
      prisma.sale.findUnique.mockResolvedValue(conflict);
      await service.checkProblem('sale', 's1', '', 'me');
      expect(prisma.sale.updateMany).toHaveBeenCalledWith({
        where: { id: 's1', checkedAt: null },
        data: {
          checkedAt: expect.any(Date),
          checkedById: 'me',
          checkNote: null,
        },
      });
    });
  });
});
