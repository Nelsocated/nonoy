import 'reflect-metadata'; // @Type() needs it; the Nest app loads it at startup
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  CheckProblemDto,
  ProblemsQueryDto,
  TripsListQueryDto,
} from './reports.dto.js';

describe('dashboard DTOs', () => {
  it('trims the note and caps it at 200 characters', () => {
    const ok = plainToInstance(CheckProblemDto, { note: '  counted twice ' });
    expect(validateSync(ok)).toEqual([]);
    expect(ok.note).toBe('counted twice');
    const long = plainToInstance(CheckProblemDto, { note: 'x'.repeat(201) });
    expect(validateSync(long)).not.toEqual([]);
  });
  it('page is a whole number from 1 to 10000', () => {
    expect(
      validateSync(plainToInstance(ProblemsQueryDto, { page: '2' })),
    ).toEqual([]);
    expect(
      validateSync(plainToInstance(ProblemsQueryDto, { page: '0' })),
    ).not.toEqual([]);
    // a huge page would only make Postgres skip past everything
    expect(
      validateSync(plainToInstance(ProblemsQueryDto, { page: '10001' })),
    ).not.toEqual([]);
  });
  it('trips list: month required as YYYY-MM from 2000, page 1-10000, workerId a UUID', () => {
    const ok = (q: object) =>
      validateSync(plainToInstance(TripsListQueryDto, q)).length === 0;
    expect(ok({ month: '2026-09' })).toBe(true);
    expect(
      ok({
        month: '2026-09',
        page: '2',
        workerId: '3f9a2c7e-1b2d-4c5e-8f90-123456789abc',
      }),
    ).toBe(true);
    for (const month of [undefined, '2026-13', '2026-00', '1999-12', '2026-9'])
      expect(ok({ month })).toBe(false);
    expect(ok({ month: '2026-09', page: '0' })).toBe(false);
    expect(ok({ month: '2026-09', page: '10001' })).toBe(false);
    expect(ok({ month: '2026-09', workerId: 'juan' })).toBe(false);
  });
});
