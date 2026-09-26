import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ExpensesService } from './expenses.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import { TripAccessService } from '../trips/trips-access.service.js';

describe('ExpensesService', () => {
  let service: ExpensesService;
  const tx = { expense: { findUnique: vi.fn(), create: vi.fn() } };
  const prisma = {
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const logs = { record: vi.fn() };
  const access = { assertOwnership: vi.fn() };

  const dto = {
    clientId: 'c1',
    activityLogClientId: 'l1',
    description: 'Gas',
    amount: '500.00',
    createdAtClient: '2026-01-01T10:00:00Z',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    tx.expense.findUnique.mockResolvedValue(null);
    tx.expense.create.mockImplementation(async ({ data }) => ({
      id: 'e1',
      ...data,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityLogsService, useValue: logs },
        { provide: TripAccessService, useValue: access },
      ],
    }).compile();
    service = module.get(ExpensesService);
  });

  it('records an expense without a trip, skipping the trip check', async () => {
    const e = await service.create(dto, 'w1');
    expect(e).toMatchObject({
      workerId: 'w1',
      tripId: undefined,
      amount: '500.00',
    });
    expect(access.assertOwnership).not.toHaveBeenCalled();
    expect(logs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'EXPENSE_RECORDED',
        workerId: 'w1',
      }),
      tx,
    );
  });

  it('checks ownership when linked to a trip', async () => {
    access.assertOwnership.mockRejectedValueOnce(new ForbiddenException());
    await expect(
      service.create({ ...dto, tripId: 't1' }, 'w2'),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("is idempotent for the same worker, forbidden for another worker's clientId", async () => {
    tx.expense.findUnique.mockResolvedValue({ id: 'old', workerId: 'w1' });
    await expect(service.create(dto, 'w1')).resolves.toEqual({
      id: 'old',
      workerId: 'w1',
    });
    await expect(service.create(dto, 'w2')).rejects.toThrow(ForbiddenException);
    expect(tx.expense.create).not.toHaveBeenCalled();
  });
});
