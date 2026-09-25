import 'reflect-metadata'; // @Type() needs it; the Nest app loads it at startup
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CheckProblemDto, ProblemsQueryDto } from './reports.dto.js';

describe('dashboard DTOs', () => {
  it('trims the note and caps it at 200 characters', () => {
    const ok = plainToInstance(CheckProblemDto, { note: '  counted twice ' });
    expect(validateSync(ok)).toEqual([]);
    expect(ok.note).toBe('counted twice');
    const long = plainToInstance(CheckProblemDto, { note: 'x'.repeat(201) });
    expect(validateSync(long)).not.toEqual([]);
  });
  it('page is a whole number from 1', () => {
    expect(
      validateSync(plainToInstance(ProblemsQueryDto, { page: '2' })),
    ).toEqual([]);
    expect(
      validateSync(plainToInstance(ProblemsQueryDto, { page: '0' })),
    ).not.toEqual([]);
  });
});
