import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateSaleDto } from './sales.dto.js';

const base = {
  clientId: '11111111-1111-4111-8111-111111111111',
  activityLogClientId: '22222222-2222-4222-8222-222222222222',
  tripId: '33333333-3333-4333-8333-333333333333',
  chickenCount: 1,
  totalKilo: '2.00',
  amount: '360.00',
  createdAtClient: '2026-09-25T01:00:00Z',
};
const errors = (extra: object) =>
  validateSync(plainToInstance(CreateSaleDto, { ...base, ...extra })).map(
    (e) => e.property,
  );

describe('CreateSaleDto prices', () => {
  it('accepts both prices, or neither (older app versions)', () => {
    expect(
      errors({ pricePerKilo: '180.00', listPricePerKilo: '190.00' }),
    ).toEqual([]);
    expect(errors({ pricePerKilo: '180.00' })).toEqual([]);
    expect(errors({})).toEqual([]);
  });

  // the owner price alone means amount can't be checked against kilos × price
  it('rejects an owner price without the price charged', () => {
    expect(errors({ listPricePerKilo: '190.00' })).toEqual(['pricePerKilo']);
  });
});
