import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/client';
import { RecountsService } from './recounts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import { TripAccessService } from '../trips/trips-access.service.js';

describe('RecountsService', () => {
  let service: RecountsService;
  const tx = {
    recount: { findUnique: vi.fn(), create: vi.fn() },
    pickup: { aggregate: vi.fn() },
    sale: { aggregate: vi.fn() },
  };
  const prisma = { $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
  const logs = { record: vi.fn() };
  const access = { assertOwnership: vi.fn() };

  const dto = {
    clientId: 'c1',
    activityLogClientId: 'l1',
    tripId: 't1',
    countedChicken: 70,
    countedKilo: '140.25',
    createdAtClient: '2026-01-01T10:00:00Z',
  };

  const sums = (chicken: number | null, kilo: string | null) => ({
    _sum: { chickenCount: chicken, totalKilo: kilo === null ? null : new Decimal(kilo) },
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    tx.recount.findUnique.mockResolvedValue(null);
    tx.recount.create.mockImplementation(async ({ data }) => ({ id: 'rc1', ...data }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecountsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityLogsService, useValue: logs },
        { provide: TripAccessService, useValue: access },
      ],
    }).compile();

    service = module.get(RecountsService);
  });

  it('expected = picked up − sold; matching count is not flagged', async () => {
    tx.pickup.aggregate.mockResolvedValue(sums(100, '200.50'));
    tx.sale.aggregate.mockResolvedValue(sums(30, '60.25'));

    const rc = await service.create(dto, 'w1');

    expect(rc.expectedChicken).toBe(70);
    expect(rc.expectedKilo.toString()).toBe('140.25');
    expect(rc.discrepancyFlagged).toBe(false);
  });

  it('flags a discrepancy when the kilo count differs', async () => {
    tx.pickup.aggregate.mockResolvedValue(sums(100, '200.50'));
    tx.sale.aggregate.mockResolvedValue(sums(30, '60.25'));

    const rc = await service.create({ ...dto, countedKilo: '139.00' }, 'w1');
    expect(rc.discrepancyFlagged).toBe(true);
  });

  it('treats a trip with no sales yet as zero sold', async () => {
    tx.pickup.aggregate.mockResolvedValue(sums(50, '100'));
    tx.sale.aggregate.mockResolvedValue(sums(null, null));

    const rc = await service.create({ ...dto, countedChicken: 50, countedKilo: '100' }, 'w1');
    expect(rc.expectedChicken).toBe(50);
    expect(rc.discrepancyFlagged).toBe(false);
  });

  it('is idempotent on clientId', async () => {
    const existing = { id: 'old' };
    tx.recount.findUnique.mockResolvedValue(existing);

    expect(await service.create(dto, 'w1')).toBe(existing);
    expect(tx.recount.create).not.toHaveBeenCalled();
    expect(logs.record).not.toHaveBeenCalled();
  });

  it('checks trip ownership before doing anything', async () => {
    access.assertOwnership.mockRejectedValueOnce(new Error('forbidden'));
    await expect(service.create(dto, 'w2')).rejects.toThrow('forbidden');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
