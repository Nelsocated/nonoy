import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TripAccessService } from '../trips/trips-access.service.js';

describe('ReportsService', () => {
  let service: ReportsService;
  const prisma = {
    $queryRaw: vi.fn(async () => [{ start: '2026-08-31 16:00:00', end: '2026-09-07 16:00:00' }]),
    trip: { findUnique: vi.fn() },
  };
  const access = { assertOwnership: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TripAccessService, useValue: access },
      ],
    }).compile();
    service = module.get(ReportsService);
  });

  describe('resolveRange', () => {
    it('reads the DB-computed window as UTC', async () => {
      const r = await service.resolveRange({ from: '2026-09-01', to: '2026-09-07' });
      expect(r.start.toISOString()).toBe('2026-08-31T16:00:00.000Z');
      expect(r.end.toISOString()).toBe('2026-09-07T16:00:00.000Z');
      expect(r.timezone).toBe('Asia/Manila');
    });

    it('defaults to the 7 days ending on `to`', async () => {
      const r = await service.resolveRange({ to: '2026-09-07' });
      expect(r.from).toBe('2026-09-01');
    });

    it('rejects from after to, and ranges over a year', async () => {
      await expect(service.resolveRange({ from: '2026-09-08', to: '2026-09-07' })).rejects.toThrow(BadRequestException);
      await expect(service.resolveRange({ from: '2024-01-01', to: '2026-01-01' })).rejects.toThrow(BadRequestException);
    });

    it('rejects impossible dates', async () => {
      await expect(service.resolveRange({ from: '2026-13-45', to: '2026-09-07' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('tripDetail', () => {
    it('workers must own the trip; owners skip the check', async () => {
      prisma.trip.findUnique.mockResolvedValue(null);
      await expect(service.tripDetail('t1', { id: 'w1', role: 'WORKER' })).rejects.toThrow();
      expect(access.assertOwnership).toHaveBeenCalledWith('t1', 'w1');

      access.assertOwnership.mockClear();
      await expect(service.tripDetail('t1', { id: 'o1', role: 'OWNER' })).rejects.toThrow('Trip not found');
      expect(access.assertOwnership).not.toHaveBeenCalled();
    });
  });
});
