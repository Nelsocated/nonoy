import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  ApproveBuyerRequestDto,
  CreateBuyerRequestDto,
  MergeBuyerRequestDto,
} from './buyer-requests.dto.js';

const ID = '3f9a2c7e-1b2d-4c5e-8f90-123456789abc';
const make = <T extends object>(cls: new () => T, body: object) =>
  plainToInstance(cls, body);
const ok = (o: object) => validateSync(o).length === 0;
const good = {
  id: ID,
  name: '  Aling Nena ',
  location: ' Jaro ',
  createdAtClient: '2026-09-26T06:41:00.000Z',
};

describe('CreateBuyerRequestDto', () => {
  it('trims name and place', () => {
    const d = make(CreateBuyerRequestDto, good);
    expect(ok(d)).toBe(true);
    expect(d.name).toBe('Aling Nena');
    expect(d.location).toBe('Jaro');
  });
  it('blank place becomes null', () => {
    const d = make(CreateBuyerRequestDto, { ...good, location: '   ' });
    expect(ok(d)).toBe(true);
    expect(d.location).toBeNull();
  });
  it.each([
    ['blank name', { name: '  ' }],
    ['name over 100', { name: 'x'.repeat(101) }],
    ['place over 100', { location: 'x'.repeat(101) }],
    ['bad id', { id: 'nope' }],
    ['bad date', { createdAtClient: 'yesterday' }],
  ])('rejects %s', (_, over) => {
    expect(ok(make(CreateBuyerRequestDto, { ...good, ...over }))).toBe(false);
  });
});

describe('decision DTOs', () => {
  it('approve needs a name, place optional', () => {
    expect(ok(make(ApproveBuyerRequestDto, { name: 'Nena' }))).toBe(true);
    expect(ok(make(ApproveBuyerRequestDto, { name: ' ' }))).toBe(false);
  });
  it('merge needs a buyer id', () => {
    expect(ok(make(MergeBuyerRequestDto, { buyerId: ID }))).toBe(true);
    expect(ok(make(MergeBuyerRequestDto, { buyerId: 'x' }))).toBe(false);
  });
});
