import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TripAccessService } from '../trips/trips-access.service.js';

describe('ReportsService', () => {
  let service: ReportsService;
  const prisma = {
    $queryRaw: vi.fn(async (..._args: unknown[]): Promise<unknown[]> => [
      { start: '2026-08-31 16:00:00', end: '2026-09-07 16:00:00' },
    ]),
    trip: { findUnique: vi.fn() },
    recount: { findMany: vi.fn() },
    sale: {
      findMany: vi.fn(),
      fields: { listPricePerKilo: 'ref:listPricePerKilo' },
    },
  };
  const access = { assertOwnership: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TripAccessService, useValue: access },
      ],
    }).compile();
    service = module.get(ReportsService);
  });

  describe('resolveRange', () => {
    it('reads the DB-computed window as UTC', async () => {
      const r = await service.resolveRange({
        from: '2026-09-01',
        to: '2026-09-07',
      });
      expect(r.start.toISOString()).toBe('2026-08-31T16:00:00.000Z');
      expect(r.end.toISOString()).toBe('2026-09-07T16:00:00.000Z');
      expect(r.timezone).toBe('Asia/Manila');
    });

    it('defaults to the 7 days ending on `to`', async () => {
      const r = await service.resolveRange({ to: '2026-09-07' });
      expect(r.from).toBe('2026-09-01');
    });

    it('rejects from after to, and ranges over a year', async () => {
      await expect(
        service.resolveRange({ from: '2026-09-08', to: '2026-09-07' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resolveRange({ from: '2024-01-01', to: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects impossible dates', async () => {
      await expect(
        service.resolveRange({ from: '2026-13-45', to: '2026-09-07' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('tripsList', () => {
    it('lists a Manila month, newest first, shaped for the page', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([
          { start: '2026-08-31 16:00:00', end: '2026-09-30 16:00:00' },
        ]) // resolveRange
        .mockResolvedValueOnce([
          {
            id: 't1',
            startedAt: new Date('2026-09-02T22:10:00Z'),
            endedAt: null,
            workerId: 'w1',
            workerName: 'Juan',
            chicken: 40,
            kilo: '80.50',
            saleCount: 3,
            amount: '1500.00',
            expenses: '200.00',
            net: '1300.00',
            problems: 2,
          },
        ])
        .mockResolvedValueOnce([{ total: 16 }]);
      const r = await service.tripsList({ month: '2026-09', page: 2 });
      expect(r).toEqual({
        items: [
          {
            id: 't1',
            startedAt: new Date('2026-09-02T22:10:00Z'),
            endedAt: null,
            worker: { id: 'w1', name: 'Juan' },
            pickedUp: { chicken: 40, kilo: '80.50' },
            sales: { count: 3, amount: '1500.00' },
            expenses: '200.00',
            net: '1300.00',
            problems: 2,
          },
        ],
        total: 16,
        page: 2,
        pageSize: 15,
      });
      // the month became a report-time-zone window (last day included)
      const range = JSON.stringify(prisma.$queryRaw.mock.calls[0]);
      expect(range).toContain('"2026-09-01"');
      expect(range).toContain('"2026-09-30"');
      // page 2 skips the first 15
      expect(prisma.$queryRaw.mock.calls[1].slice(1)).toEqual(
        expect.arrayContaining([15]),
      );
    });
  });

  describe('tripDetail', () => {
    it('workers must own the trip; owners skip the check', async () => {
      prisma.trip.findUnique.mockResolvedValue(null);
      await expect(
        service.tripDetail('t1', { id: 'w1', role: 'WORKER' }),
      ).rejects.toThrow();
      expect(access.assertOwnership).toHaveBeenCalledWith('t1', 'w1');

      access.assertOwnership.mockClear();
      await expect(
        service.tripDetail('t1', { id: 'o1', role: 'OWNER' }),
      ).rejects.toThrow('Trip not found');
      expect(access.assertOwnership).not.toHaveBeenCalled();
    });

    it("leaves the owner's check notes out for workers", async () => {
      prisma.trip.findUnique.mockResolvedValue(null);
      const omit = { checkedAt: true, checkedById: true, checkNote: true };
      await service
        .tripDetail('t1', { id: 'w1', role: 'WORKER' })
        .catch(() => {});
      const worker = prisma.trip.findUnique.mock.calls[0][0].include;
      expect(worker.sales.omit).toEqual(omit);
      expect(worker.recounts.omit).toEqual(omit);

      prisma.trip.findUnique.mockClear();
      await service
        .tripDetail('t1', { id: 'o1', role: 'OWNER' })
        .catch(() => {});
      const owner = prisma.trip.findUnique.mock.calls[0][0].include;
      expect(owner.sales.omit).toBeUndefined();
      expect(owner.recounts.omit).toBeUndefined();
    });
  });

  describe('discrepancies', () => {
    it('asks the database for sales where the worker changed the owner price', async () => {
      prisma.recount.findMany.mockResolvedValue([]);
      prisma.sale.findMany.mockImplementation(async ({ where }: any) =>
        where.syncStatus ? [] : [{ id: 'edited' }],
      );
      const r = await service.discrepancies({
        from: '2026-09-01',
        to: '2026-09-07',
      });
      expect(r.priceChangedSales).toEqual([{ id: 'edited' }]);
      // compared in SQL (column vs column), not by loading every priced sale
      const priced = prisma.sale.findMany.mock.calls
        .map(([args]: any) => args.where)
        .find((w: any) => !w.syncStatus);
      expect(priced).toMatchObject({
        pricePerKilo: { not: null },
        listPricePerKilo: { not: null },
        NOT: { pricePerKilo: { equals: 'ref:listPricePerKilo' } },
      });
    });
  });
});
