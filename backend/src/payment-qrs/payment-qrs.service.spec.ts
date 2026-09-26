import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentQrsService } from './payment-qrs.service.js';

describe('PaymentQrsService', () => {
  const tx = { paymentQr: { count: vi.fn(), create: vi.fn() } };
  const prisma = {
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    paymentQr: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  const service = new PaymentQrsService(prisma as any);
  const row = { id: 'q1', label: 'GCash', payload: '0002' };

  beforeEach(() => vi.clearAllMocks());

  it('lists codes in the order they were added', async () => {
    prisma.paymentQr.findMany.mockResolvedValue([row]);
    expect(await service.list()).toEqual([row]);
    expect(prisma.paymentQr.findMany).toHaveBeenCalledWith({
      select: { id: true, label: true, payload: true },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('adds a code while there are fewer than 10', async () => {
    tx.paymentQr.count.mockResolvedValue(9);
    tx.paymentQr.create.mockResolvedValue(row);
    expect(await service.create({ label: 'GCash', payload: '0002' })).toBe(row);
  });

  it('refuses an 11th code', async () => {
    tx.paymentQr.count.mockResolvedValue(10);
    await expect(
      service.create({ label: 'GCash', payload: '0002' }),
    ).rejects.toThrow(new BadRequestException('Up to 10 QR codes'));
    expect(tx.paymentQr.create).not.toHaveBeenCalled();
  });

  it('renames / replaces an existing code', async () => {
    prisma.paymentQr.findUnique.mockResolvedValue(row);
    prisma.paymentQr.update.mockResolvedValue({ ...row, label: 'Maya' });
    expect((await service.update('q1', { label: 'Maya' })).label).toBe('Maya');
  });

  it('removes a code for good', async () => {
    prisma.paymentQr.findUnique.mockResolvedValue(row);
    expect(await service.remove('q1')).toEqual({ id: 'q1' });
    expect(prisma.paymentQr.delete).toHaveBeenCalledWith({
      where: { id: 'q1' },
    });
  });

  it.each(['update', 'remove'] as const)(
    '%s an unknown code → 404',
    async (m) => {
      prisma.paymentQr.findUnique.mockResolvedValue(null);
      await expect(
        m === 'update' ? service.update('x', {}) : service.remove('x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );
});
