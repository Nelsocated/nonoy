import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import { TripAccessService } from '../trips/trips-access.service.js';

describe('SalesService', () => {
  let service: SalesService;
  const tx = { sale: { findUnique: vi.fn(), create: vi.fn() } };
  const prisma = { $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
  const logs = { record: vi.fn() };
  const access = { assertOwnership: vi.fn() };

  const sale = (createdAtClient: string) => ({
    clientId: 'c1',
    activityLogClientId: 'l1',
    tripId: 't1',
    chickenCount: 1,
    totalKilo: '2.00',
    amount: '300',
    createdAtClient,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    tx.sale.findUnique.mockResolvedValue(null);
    tx.sale.create.mockImplementation(async ({ data }) => ({ id: 's1', ...data }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityLogsService, useValue: logs },
        { provide: TripAccessService, useValue: access },
      ],
    }).compile();

    service = module.get(SalesService);
  });

  it('open trip → SYNCED', async () => {
    access.assertOwnership.mockResolvedValue({ endedAt: null });
    const s = await service.create(sale('2026-01-01T10:00:00Z'), 'w1');
    expect(s.syncStatus).toBe('SYNCED');
    expect(s.conflictReason).toBeNull();
  });

  it('made during the trip but synced after it ended → SYNCED', async () => {
    access.assertOwnership.mockResolvedValue({ endedAt: new Date('2026-01-01T12:00:00Z') });
    const s = await service.create(sale('2026-01-01T11:00:00Z'), 'w1');
    expect(s.syncStatus).toBe('SYNCED');
  });

  it('made after the trip ended → CONFLICT, still saved', async () => {
    access.assertOwnership.mockResolvedValue({ endedAt: new Date('2026-01-01T12:00:00Z') });
    const s = await service.create(sale('2026-01-01T13:00:00Z'), 'w1');
    expect(s.syncStatus).toBe('CONFLICT');
    expect(s.conflictReason).toMatch(/after its trip had ended/);
    expect(tx.sale.create).toHaveBeenCalled();
  });

  it('writes the activity log in the same transaction', async () => {
    access.assertOwnership.mockResolvedValue({ endedAt: null });
    await service.create(sale('2026-01-01T10:00:00Z'), 'w1');
    expect(logs.record).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'l1', workerId: 'w1', actionType: 'SALE_RECORDED' }),
      tx,
    );
  });

  it('is idempotent on clientId', async () => {
    access.assertOwnership.mockResolvedValue({ endedAt: null });
    const existing = { id: 'old' };
    tx.sale.findUnique.mockResolvedValue(existing);
    expect(await service.create(sale('2026-01-01T10:00:00Z'), 'w1')).toBe(existing);
    expect(tx.sale.create).not.toHaveBeenCalled();
  });
});
