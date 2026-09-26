import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/client';
import { SalesService } from './sales.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import { TripAccessService } from '../trips/trips-access.service.js';

describe('SalesService', () => {
  let service: SalesService;
  const tx = {
    sale: { findUnique: vi.fn(), create: vi.fn() },
    buyerRequest: { findUnique: vi.fn() },
    $executeRaw: vi.fn(),
  };
  const prisma = {
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    sale: { findUnique: vi.fn() },
  };
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
    tx.sale.create.mockImplementation(async ({ data }) => ({
      id: 's1',
      ...data,
    }));

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
    access.assertOwnership.mockResolvedValue({
      endedAt: new Date('2026-01-01T12:00:00Z'),
    });
    const s = await service.create(sale('2026-01-01T11:00:00Z'), 'w1');
    expect(s.syncStatus).toBe('SYNCED');
  });

  it('made after the trip ended → CONFLICT, still saved', async () => {
    access.assertOwnership.mockResolvedValue({
      endedAt: new Date('2026-01-01T12:00:00Z'),
    });
    const s = await service.create(sale('2026-01-01T13:00:00Z'), 'w1');
    expect(s.syncStatus).toBe('CONFLICT');
    expect(s.conflictReason).toMatch(/after its trip had ended/);
    expect(tx.sale.create).toHaveBeenCalled();
  });

  it('writes the activity log in the same transaction', async () => {
    access.assertOwnership.mockResolvedValue({ endedAt: null });
    await service.create(sale('2026-01-01T10:00:00Z'), 'w1');
    expect(logs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'l1',
        workerId: 'w1',
        actionType: 'SALE_RECORDED',
      }),
      tx,
    );
  });

  it('stores the payment method, defaulting to CASH in the log', async () => {
    access.assertOwnership.mockResolvedValue({ endedAt: null });
    const qr = await service.create(
      { ...sale('2026-01-01T10:00:00Z'), paymentMethod: 'QR' },
      'w1',
    );
    expect(qr.paymentMethod).toBe('QR');

    await service.create(sale('2026-01-01T10:00:00Z'), 'w1');
    expect(logs.record).toHaveBeenLastCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ paymentMethod: 'CASH' }),
      }),
      tx,
    );
  });

  it('is idempotent on clientId', async () => {
    access.assertOwnership.mockResolvedValue({ endedAt: null });
    const existing = { id: 'old' };
    tx.sale.findUnique.mockResolvedValue(existing);
    expect(await service.create(sale('2026-01-01T10:00:00Z'), 'w1')).toBe(
      existing,
    );
    expect(tx.sale.create).not.toHaveBeenCalled();
  });

  describe('owner price on the sale', () => {
    const priced = (
      totalKilo: string,
      pricePerKilo: string,
      amount: string,
    ) => ({
      ...sale('2026-01-01T10:00:00Z'),
      totalKilo,
      pricePerKilo,
      listPricePerKilo: '180.00',
      amount,
    });

    beforeEach(() =>
      access.assertOwnership.mockResolvedValue({ id: 't1', endedAt: null }),
    );

    it('stores the price charged and the owner price the phone had', async () => {
      await service.create(priced('2.50', '180.00', '450.00'), 'w1');
      expect(tx.sale.create.mock.calls[0][0].data).toMatchObject({
        pricePerKilo: '180.00',
        listPricePerKilo: '180.00',
        amount: '450.00',
      });
    });

    it('rounds half-up to the centavo like the phone (1.25 kg × ₱180.10 = ₱225.13)', async () => {
      await expect(
        service.create(priced('1.25', '180.10', '225.13'), 'w1'),
      ).resolves.toBeDefined();
    });

    it("rejects an amount that isn't kilos × price", async () => {
      await expect(
        service.create(priced('2.50', '180.00', '450.01'), 'w1'),
      ).rejects.toThrow("amount doesn't match kilos × price");
      expect(tx.sale.create).not.toHaveBeenCalled();
    });

    it('still accepts sales from older app versions that send no price', async () => {
      await service.create(sale('2026-01-01T10:00:00Z'), 'w1');
      expect(tx.sale.create.mock.calls[0][0].data.pricePerKilo).toBeUndefined();
    });
  });

  describe('buyer requests', () => {
    const withRequest = (over = {}) => ({
      ...sale('2026-01-01T10:00:00Z'),
      buyerRequestId: 'r1',
      ...over,
    });
    beforeEach(() =>
      access.assertOwnership.mockResolvedValue({ endedAt: null }),
    );

    it('buyer and request together → 400', async () => {
      await expect(
        service.create(withRequest({ buyerId: 'b1' }), 'w1'),
      ).rejects.toThrow('either a buyer or a new buyer');
    });

    it('waiting request: sale points at it, no buyer yet (row locked first)', async () => {
      tx.buyerRequest.findUnique.mockResolvedValue({
        id: 'r1',
        requestedById: 'w1',
        status: 'PENDING',
        buyerId: null,
      });
      const s = await service.create(withRequest(), 'w1');
      expect(tx.$executeRaw).toHaveBeenCalled(); // FOR SHARE: waits for a decision in progress
      expect(s).toMatchObject({ buyerRequestId: 'r1', buyerId: null });
    });

    it.each(['APPROVED', 'MERGED'])(
      'already %s → gets that buyer',
      async (status) => {
        tx.buyerRequest.findUnique.mockResolvedValue({
          id: 'r1',
          requestedById: 'w1',
          status,
          buyerId: 'b9',
        });
        const s = await service.create(withRequest(), 'w1');
        expect(s).toMatchObject({ buyerRequestId: 'r1', buyerId: 'b9' });
      },
    );

    it('already rejected → walk-in', async () => {
      tx.buyerRequest.findUnique.mockResolvedValue({
        id: 'r1',
        requestedById: 'w1',
        status: 'REJECTED',
        buyerId: null,
      });
      const s = await service.create(withRequest(), 'w1');
      expect(s).toMatchObject({ buyerRequestId: 'r1', buyerId: null });
    });

    it.each([
      ['missing (its request failed to sync)', null],
      [
        "someone else's",
        { id: 'r1', requestedById: 'w2', status: 'PENDING', buyerId: null },
      ],
    ])('%s request → Buyer request not found', async (_, row) => {
      tx.buyerRequest.findUnique.mockResolvedValue(row);
      await expect(service.create(withRequest(), 'w1')).rejects.toThrow(
        'Buyer request not found',
      );
    });
  });

  describe('receipt', () => {
    const row = (over = {}) => ({
      clientId: 'c1',
      tripId: 't1',
      createdAtClient: new Date('2026-09-26T06:41:00Z'),
      chickenCount: 12,
      totalKilo: new Decimal('10.5'),
      pricePerKilo: new Decimal('180'),
      amount: new Decimal('1890'),
      paymentMethod: 'CASH',
      buyer: { name: 'Aling Nena' },
      trip: { worker: { name: 'Juan' } },
      ...over,
    });

    it('returns the receipt with buyer and worker names, 2-decimal numbers', async () => {
      prisma.sale.findUnique.mockResolvedValue(row());
      expect(await service.receipt('c1')).toEqual({
        clientId: 'c1',
        tripId: 't1',
        createdAtClient: new Date('2026-09-26T06:41:00Z'),
        workerName: 'Juan',
        buyerName: 'Aling Nena',
        chickenCount: 12,
        totalKilo: '10.50',
        pricePerKilo: '180.00',
        amount: '1890.00',
        paymentMethod: 'CASH',
      });
      expect(prisma.sale.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clientId: 'c1' } }),
      );
    });

    it('walk-in and pre-price sales → nulls', async () => {
      prisma.sale.findUnique.mockResolvedValue(
        row({ buyer: null, pricePerKilo: null }),
      );
      const r = await service.receipt('c1');
      expect(r.buyerName).toBeNull();
      expect(r.pricePerKilo).toBeNull();
    });

    it('archived buyer still named (no archived filter)', async () => {
      prisma.sale.findUnique.mockResolvedValue(
        row({ buyer: { name: 'Old Buyer' } }),
      );
      expect((await service.receipt('c1')).buyerName).toBe('Old Buyer');
      const args = prisma.sale.findUnique.mock.calls[0][0];
      expect(JSON.stringify(args)).not.toContain('archivedAt');
    });

    it('unknown sale → 404', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);
      await expect(service.receipt('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
