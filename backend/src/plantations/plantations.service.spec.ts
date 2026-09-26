import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PlantationsService } from './plantations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('PlantationsService', () => {
  let service: PlantationsService;
  const tx = {
    $executeRaw: vi.fn(),
    plantation: { findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
    pickup: { count: vi.fn() },
  };
  const prisma = {
    plantation: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlantationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(PlantationsService);
  });

  it('lists only active plantations by default (what phones pull)', async () => {
    await service.findAll();
    expect(prisma.plantation.findMany).toHaveBeenCalledWith({
      where: { archivedAt: null },
      orderBy: { name: 'asc' },
    });
  });

  it('lists archived ones too when asked', async () => {
    await service.findAll(true);
    expect(prisma.plantation.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { name: 'asc' },
    });
  });

  it('deletes a plantation with no pickups', async () => {
    tx.plantation.findUnique.mockResolvedValue({ id: 'p1', archivedAt: null });
    tx.pickup.count.mockResolvedValue(0);
    await expect(service.remove('p1')).resolves.toEqual({
      result: 'deleted',
      uses: 0,
    });
    expect(tx.plantation.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('archives a plantation that has pickups, keeping history', async () => {
    tx.plantation.findUnique.mockResolvedValue({ id: 'p1', archivedAt: null });
    tx.pickup.count.mockResolvedValue(12);
    await expect(service.remove('p1')).resolves.toEqual({
      result: 'archived',
      uses: 12,
    });
    expect(tx.plantation.delete).not.toHaveBeenCalled();
    expect(tx.plantation.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { archivedAt: expect.any(Date) },
    });
  });

  it('removing an already archived plantation leaves it archived', async () => {
    tx.plantation.findUnique.mockResolvedValue({
      id: 'p1',
      archivedAt: new Date('2026-09-01'),
    });
    tx.pickup.count.mockResolvedValue(3);
    await expect(service.remove('p1')).resolves.toEqual({
      result: 'archived',
      uses: 3,
    });
    expect(tx.plantation.update).not.toHaveBeenCalled();
  });

  it('locks the plantation before counting, so a new pickup waits', async () => {
    tx.plantation.findUnique.mockResolvedValue({ id: 'x1', archivedAt: null });
    tx.pickup.count.mockResolvedValue(0);
    await service.remove('x1');
    const [sql] = tx.$executeRaw.mock.calls[0];
    expect(sql.join('?')).toMatch(/FROM plantations WHERE id = \? FOR UPDATE/);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.pickup.count.mock.invocationCallOrder[0],
    );
  });

  it('404s for an unknown plantation on remove and restore', async () => {
    tx.plantation.findUnique.mockResolvedValue(null);
    prisma.plantation.findUnique.mockResolvedValue(null);
    await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    await expect(service.restore('x')).rejects.toThrow(NotFoundException);
  });

  it('restore clears archivedAt', async () => {
    prisma.plantation.findUnique.mockResolvedValue({ id: 'p1' });
    await service.restore('p1');
    expect(prisma.plantation.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { archivedAt: null },
    });
  });
});
