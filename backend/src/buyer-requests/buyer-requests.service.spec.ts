import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BuyerRequestsService } from './buyer-requests.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('BuyerRequestsService', () => {
  let service: BuyerRequestsService;
  const tx = {
    $executeRaw: vi.fn(),
    buyerRequest: { findUnique: vi.fn(), update: vi.fn() },
    buyer: { create: vi.fn(), findUnique: vi.fn() },
    sale: { updateMany: vi.fn() },
  };
  const prisma = {
    buyerRequest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const dto = {
    id: 'r1',
    name: 'Nena',
    location: null,
    createdAtClient: '2026-09-26T06:41:00.000Z',
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuyerRequestsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(BuyerRequestsService);
  });

  describe('create (from /sync)', () => {
    it('saves a new request for the caller', async () => {
      prisma.buyerRequest.findUnique.mockResolvedValue(null);
      prisma.buyerRequest.create.mockResolvedValue({ id: 'r1' });
      await service.create(dto, 'w1');
      expect(prisma.buyerRequest.create).toHaveBeenCalledWith({
        data: {
          id: 'r1',
          name: 'Nena',
          location: null,
          requestedById: 'w1',
          createdAtClient: new Date(dto.createdAtClient),
        },
      });
    });
    it('sent again: returns the saved one, no duplicate', async () => {
      prisma.buyerRequest.findUnique.mockResolvedValue({
        id: 'r1',
        requestedById: 'w1',
      });
      await expect(service.create(dto, 'w1')).resolves.toMatchObject({
        id: 'r1',
      });
      expect(prisma.buyerRequest.create).not.toHaveBeenCalled();
    });
    it("someone else's id is refused", async () => {
      prisma.buyerRequest.findUnique.mockResolvedValue({
        id: 'r1',
        requestedById: 'w2',
      });
      await expect(service.create(dto, 'w1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('mine', () => {
    it('last 60 days plus anything still waiting, newest first', async () => {
      prisma.buyerRequest.findMany.mockResolvedValue([]);
      await service.mine('w1', new Date('2026-09-26T00:00:00Z'));
      expect(prisma.buyerRequest.findMany).toHaveBeenCalledWith({
        where: {
          requestedById: 'w1',
          OR: [
            { status: 'PENDING' },
            { createdAtClient: { gte: new Date('2026-07-28T00:00:00Z') } },
          ],
        },
        orderBy: { createdAtClient: 'desc' },
        select: {
          id: true,
          name: true,
          location: true,
          status: true,
          buyerId: true,
          createdAtClient: true,
        },
      });
    });
  });
});
