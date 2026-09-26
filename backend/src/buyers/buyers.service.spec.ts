import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BuyersService } from './buyers.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('BuyersService', () => {
  let service: BuyersService;
  const tx = {
    $executeRaw: vi.fn(),
    buyer: { findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
    sale: { count: vi.fn() },
    buyerRequest: { count: vi.fn() },
  };
  const prisma = {
    buyer: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [BuyersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(BuyersService);
  });

  it('lists only active buyers by default (what phones pull)', async () => {
    await service.findAll();
    expect(prisma.buyer.findMany).toHaveBeenCalledWith({
      where: { archivedAt: null },
      orderBy: { name: 'asc' },
    });
  });

  it('lists archived ones too when asked', async () => {
    await service.findAll(true);
    expect(prisma.buyer.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { name: 'asc' },
    });
  });

  it('deletes a buyer with no sales', async () => {
    tx.buyer.findUnique.mockResolvedValue({ id: 'b1', archivedAt: null });
    tx.sale.count.mockResolvedValue(0);
    await expect(service.remove('b1')).resolves.toEqual({
      result: 'deleted',
      uses: 0,
    });
    expect(tx.buyer.delete).toHaveBeenCalledWith({ where: { id: 'b1' } });
  });

  it('archives a buyer a new-buyer request became, even with no sales yet', async () => {
    tx.buyer.findUnique.mockResolvedValue({ id: 'b1', archivedAt: null });
    tx.sale.count.mockResolvedValue(0);
    tx.buyerRequest.count.mockResolvedValue(1);
    await expect(service.remove('b1')).resolves.toEqual({
      result: 'archived',
      uses: 0,
    });
    expect(tx.buyer.delete).not.toHaveBeenCalled();
  });

  it('only counts requests decided in the last 60 days', async () => {
    tx.buyer.findUnique.mockResolvedValue({ id: 'b1', archivedAt: null });
    tx.sale.count.mockResolvedValue(0);
    tx.buyerRequest.count.mockResolvedValue(0); // decided long ago
    await expect(
      service.remove('b1', new Date('2026-09-26T00:00:00Z')),
    ).resolves.toEqual({ result: 'deleted', uses: 0 });
    expect(tx.buyerRequest.count).toHaveBeenCalledWith({
      where: {
        buyerId: 'b1',
        OR: [
          { decidedAt: null },
          { decidedAt: { gte: new Date('2026-07-28T00:00:00Z') } },
        ],
      },
    });
  });

  it('archives a buyer that has sales, keeping history', async () => {
    tx.buyer.findUnique.mockResolvedValue({ id: 'b1', archivedAt: null });
    tx.sale.count.mockResolvedValue(12);
    await expect(service.remove('b1')).resolves.toEqual({
      result: 'archived',
      uses: 12,
    });
    expect(tx.buyer.delete).not.toHaveBeenCalled();
    expect(tx.buyer.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { archivedAt: expect.any(Date) },
    });
  });

  it('removing an already archived buyer leaves it archived', async () => {
    tx.buyer.findUnique.mockResolvedValue({
      id: 'b1',
      archivedAt: new Date('2026-09-01'),
    });
    tx.sale.count.mockResolvedValue(3);
    await expect(service.remove('b1')).resolves.toEqual({
      result: 'archived',
      uses: 3,
    });
    expect(tx.buyer.update).not.toHaveBeenCalled();
  });

  it('locks the buyer before counting, so a new sale waits', async () => {
    tx.buyer.findUnique.mockResolvedValue({ id: 'x1', archivedAt: null });
    tx.sale.count.mockResolvedValue(0);
    await service.remove('x1');
    const [sql] = tx.$executeRaw.mock.calls[0];
    expect(sql.join('?')).toMatch(/FROM buyers WHERE id = \? FOR UPDATE/);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.sale.count.mock.invocationCallOrder[0],
    );
  });

  it('404s for an unknown buyer on remove and restore', async () => {
    tx.buyer.findUnique.mockResolvedValue(null);
    prisma.buyer.findUnique.mockResolvedValue(null);
    await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    await expect(service.restore('x')).rejects.toThrow(NotFoundException);
  });

  it('restore clears archivedAt', async () => {
    prisma.buyer.findUnique.mockResolvedValue({ id: 'b1' });
    await service.restore('b1');
    expect(prisma.buyer.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { archivedAt: null },
    });
  });
});
