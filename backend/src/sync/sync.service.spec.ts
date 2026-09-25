import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service.js';
import { TripsService } from '../trips/trips.service.js';
import { PickupsService } from '../pickups/pickups.service.js';
import { SalesService } from '../sales/sales.service.js';
import { RecountsService } from '../recounts/recounts.service.js';
import { ExpensesService } from '../expenses/expenses.service.js';

describe('SyncService', () => {
  let service: SyncService;
  let calls: string[];
  const trips = { create: vi.fn(), endTrip: vi.fn() };
  const pickups = { create: vi.fn() };
  const sales = { create: vi.fn() };
  const recounts = { create: vi.fn() };
  const expenses = { create: vi.fn() };

  // each mock records when it ran and echoes an id back
  const track = (name: string) => async (dto: { clientId?: string }) => {
    calls.push(name);
    return { id: `srv-${dto.clientId ?? name}` };
  };

  beforeEach(async () => {
    calls = [];
    vi.resetAllMocks();
    trips.create.mockImplementation(track('trip'));
    trips.endTrip.mockImplementation(async (id: string) => {
      calls.push('end');
      return { id };
    });
    pickups.create.mockImplementation(track('pickup'));
    sales.create.mockImplementation(track('sale'));
    recounts.create.mockImplementation(track('recount'));
    expenses.create.mockImplementation(track('expense'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: TripsService, useValue: trips },
        { provide: PickupsService, useValue: pickups },
        { provide: SalesService, useValue: sales },
        { provide: RecountsService, useValue: recounts },
        { provide: ExpensesService, useValue: expenses },
      ],
    }).compile();

    service = module.get(SyncService);
  });

  const batch = {
    // passed in "wrong" order on purpose — the service decides the order
    tripEndings: [{ tripId: 't1', endedAt: '2026-01-01T10:00:00Z' }],
    recounts: [{ clientId: 'r1' }],
    expenses: [{ clientId: 'e1' }],
    sales: [{ clientId: 's1' }],
    pickups: [{ clientId: 'p1' }],
    trips: [{ clientId: 't1' }],
  } as any;

  it('processes trips → pickups → sales → expenses → recounts → trip endings', async () => {
    await service.processBatch(batch, 'w1');
    expect(calls).toEqual([
      'trip',
      'pickup',
      'sale',
      'expense',
      'recount',
      'end',
    ]);
  });

  // Worker ended yesterday's trip and started a new one while offline: the old
  // trip must close before the new one opens, or "one open trip" rejects it.
  it('ends trips that are not in this batch before creating new trips', async () => {
    const r = await service.processBatch(
      {
        trips: [{ clientId: 't2' }],
        tripEndings: [
          { tripId: 't1', endedAt: '2026-01-01T10:00:00Z' },
          { tripId: 't2', endedAt: '2026-01-01T18:00:00Z' },
        ],
      } as any,
      'w1',
    );
    expect(calls).toEqual(['end', 'trip', 'end']);
    expect(trips.endTrip.mock.calls.map((c) => c[0])).toEqual(['t1', 't2']);
    expect(r.tripEndings.map((e) => e.clientId)).toEqual(['t1', 't2']);
  });

  it('passes the authenticated worker id to every service', async () => {
    await service.processBatch(batch, 'w1');
    expect(trips.create).toHaveBeenCalledWith(batch.trips[0], 'w1');
    expect(sales.create).toHaveBeenCalledWith(batch.sales[0], 'w1');
    expect(trips.endTrip).toHaveBeenCalledWith(
      't1',
      batch.tripEndings[0],
      'w1',
    );
  });

  it('one failing item does not abort the rest of the batch', async () => {
    sales.create.mockRejectedValueOnce(new Error('boom'));
    const res = await service.processBatch(
      {
        sales: [{ clientId: 'bad' }, { clientId: 'good' }],
        recounts: [{ clientId: 'r1' }],
      } as any,
      'w1',
    );
    expect(res.sales).toEqual([
      { clientId: 'bad', status: 'error', error: 'boom' },
      { clientId: 'good', status: 'ok', serverId: 'srv-good' },
    ]);
    expect(res.recounts[0].status).toBe('ok');
  });

  it('creates trips one at a time, not concurrently', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    trips.create.mockImplementation(async (dto: { clientId: string }) => {
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return { id: dto.clientId };
    });
    await service.processBatch(
      { trips: [{ clientId: 'a' }, { clientId: 'b' }] } as any,
      'w1',
    );
    expect(maxInFlight).toBe(1);
  });

  it('handles an empty batch', async () => {
    expect(await service.processBatch({}, 'w1')).toEqual({
      trips: [],
      tripEndings: [],
      pickups: [],
      sales: [],
      recounts: [],
      expenses: [],
    });
  });
});
