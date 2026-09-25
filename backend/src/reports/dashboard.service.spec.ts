import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('DashboardService', () => {
  let service: DashboardService;
  const prisma = { $queryRaw: vi.fn() };

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
});
