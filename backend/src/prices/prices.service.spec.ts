import { BadRequestException } from '@nestjs/common';
import { PricesService } from './prices.service.js';

describe('PricesService', () => {
  const prisma = {
    price: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  };
  const service = new PricesService(prisma as any);
  const setBy = { select: { id: true, name: true } };

  beforeEach(() => vi.resetAllMocks());

  it('current() is the newest price, or null when none was set', async () => {
    prisma.price.findFirst
      .mockResolvedValueOnce({ id: 'p2' })
      .mockResolvedValueOnce(null);
    expect(await service.current()).toEqual({ id: 'p2' });
    expect(await service.current()).toBeNull();
    expect(prisma.price.findFirst).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      include: { setBy },
    });
  });

  it('history() lists the last 50 changes, newest first, with who set them', async () => {
    prisma.price.findMany.mockResolvedValue([]);
    await service.history();
    expect(prisma.price.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { setBy },
    });
  });

  it('create() records who set the price', async () => {
    prisma.price.create.mockResolvedValue({ id: 'p3' });
    await service.create('owner-1', { pricePerKilo: '180.00' });
    expect(prisma.price.create).toHaveBeenCalledWith({
      data: { pricePerKilo: '180.00', setById: 'owner-1' },
      include: { setBy },
    });
  });

  it('create() rejects a zero price', async () => {
    await expect(
      service.create('owner-1', { pricePerKilo: '0.00' }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.price.create).not.toHaveBeenCalled();
  });
});
