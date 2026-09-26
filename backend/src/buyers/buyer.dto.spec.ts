import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateBuyerDto, UpdateBuyerDto } from './buyer.dto.js';
import {
  CreatePlantationDto,
  UpdatePlantationDto,
} from '../plantations/plantations.dto.js';
import { UpdateUserDto } from '../users/users.dto.js';

const bad = (cls: new () => object, name: unknown, body: object = { name }) =>
  validateSync(plainToInstance(cls, body)).length > 0;

describe('reference data names', () => {
  it.each(['', '   '])('rejects blank name %j', (name) => {
    expect(bad(CreateBuyerDto, name)).toBe(true);
    expect(bad(CreatePlantationDto, name)).toBe(true);
  });
  it('accepts a real name', () => {
    expect(bad(CreateBuyerDto, 'Aling Nena')).toBe(false);
    expect(bad(CreatePlantationDto, 'Farm A')).toBe(false);
  });

  // a PATCH may leave the name out, but not clear it (null would reach
  // Prisma and come back as a 500)
  it('PATCH: name may be left out but not set to null', () => {
    for (const cls of [UpdateBuyerDto, UpdatePlantationDto, UpdateUserDto]) {
      expect(bad(cls, undefined, {})).toBe(false);
      expect(bad(cls, null)).toBe(true);
      expect(bad(cls, '  ')).toBe(true);
    }
    expect(bad(UpdateUserDto, null, { phone: null })).toBe(true);
    expect(bad(UpdateBuyerDto, undefined, { location: null })).toBe(false);
  });
});
