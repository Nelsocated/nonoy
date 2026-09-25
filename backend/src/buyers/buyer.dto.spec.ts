import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateBuyerDto } from './buyer.dto.js';
import { CreatePlantationDto } from '../plantations/plantations.dto.js';

const bad = (cls: new () => object, name: string) =>
  validateSync(plainToInstance(cls, { name })).length > 0;

describe('reference data names', () => {
  it.each(['', '   '])('rejects blank name %j', (name) => {
    expect(bad(CreateBuyerDto, name)).toBe(true);
    expect(bad(CreatePlantationDto, name)).toBe(true);
  });
  it('accepts a real name', () => {
    expect(bad(CreateBuyerDto, 'Aling Nena')).toBe(false);
    expect(bad(CreatePlantationDto, 'Farm A')).toBe(false);
  });
});
