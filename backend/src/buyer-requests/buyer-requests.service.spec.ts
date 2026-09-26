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

  describe('pending', () => {
    it('oldest first with who asked and how many sales', async () => {
      prisma.buyerRequest.findMany.mockResolvedValue([
        { id: 'r1', name: 'Nena', _count: { sales: 3 } },
      ]);
      expect(await service.pending()).toEqual([
        { id: 'r1', name: 'Nena', sales: 3 },
      ]);
      expect(prisma.buyerRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
          orderBy: { createdAtClient: 'asc' },
        }),
      );
    });
  });

  describe('decisions', () => {
    const waiting = { id: 'r1', status: 'PENDING', requestedById: 'w1' };
    beforeEach(() => {
      tx.buyerRequest.findUnique.mockResolvedValue(waiting);
      tx.buyerRequest.update.mockImplementation(
        async ({ data }: { data: object }) => ({ id: 'r1', ...data }),
      );
    });

    it('approve: new buyer, sales get it, request APPROVED — row locked first', async () => {
      tx.buyer.create.mockResolvedValue({ id: 'b1', name: 'Aling Nena' });
      const r = await service.approve(
        'r1',
        { name: 'Aling Nena', location: 'Jaro' },
        'o1',
      );
      expect(tx.$executeRaw).toHaveBeenCalled();
      expect(tx.buyer.create).toHaveBeenCalledWith({
        data: { name: 'Aling Nena', location: 'Jaro' },
      });
      expect(tx.sale.updateMany).toHaveBeenCalledWith({
        where: { buyerRequestId: 'r1' },
        data: { buyerId: 'b1' },
      });
      expect(r).toMatchObject({
        status: 'APPROVED',
        buyerId: 'b1',
        decidedById: 'o1',
      });
    });

    it('merge: sales move to the chosen active buyer', async () => {
      tx.buyer.findUnique.mockResolvedValue({ id: 'b2', archivedAt: null });
      const r = await service.merge('r1', 'b2', 'o1');
      expect(tx.sale.updateMany).toHaveBeenCalledWith({
        where: { buyerRequestId: 'r1' },
        data: { buyerId: 'b2' },
      });
      expect(r).toMatchObject({ status: 'MERGED', buyerId: 'b2' });
    });

    it('merge into an archived or missing buyer → 400', async () => {
      tx.buyer.findUnique.mockResolvedValue({
        id: 'b2',
        archivedAt: new Date(),
      });
      await expect(service.merge('r1', 'b2', 'o1')).rejects.toThrow(
        'Pick an active buyer',
      );
      tx.buyer.findUnique.mockResolvedValue(null);
      await expect(service.merge('r1', 'b2', 'o1')).rejects.toThrow(
        'Pick an active buyer',
      );
    });

    it('reject: sales untouched (walk-in), request REJECTED', async () => {
      const r = await service.reject('r1', 'o1');
      expect(tx.sale.updateMany).not.toHaveBeenCalled();
      expect(r).toMatchObject({ status: 'REJECTED', buyerId: null });
    });

    it('already decided → 409', async () => {
      tx.buyerRequest.findUnique.mockResolvedValue({
        ...waiting,
        status: 'MERGED',
      });
      await expect(service.reject('r1', 'o1')).rejects.toThrow(
        'Already decided',
      );
    });

    it('unknown → 404', async () => {
      tx.buyerRequest.findUnique.mockResolvedValue(null);
      await expect(service.reject('r1', 'o1')).rejects.toThrow(
        'Buyer request not found',
      );
    });
  });
});
