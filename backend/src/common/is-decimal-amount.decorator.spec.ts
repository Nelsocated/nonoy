import { validateSync } from 'class-validator';
import { IsDecimalAmount } from './is-decimal-amount.decorator.js';

class Probe {
  @IsDecimalAmount()
  v: string;
}
const ok = (v: string) => {
  const p = new Probe();
  p.v = v;
  return validateSync(p).length === 0;
};

describe('IsDecimalAmount', () => {
  it.each(['0', '300', '140.25', '0.5', '99999999.99'])('accepts %s', (v) => {
    expect(ok(v)).toBe(true);
  });
  it.each(['-500', '1e5', '1.234', '', 'abc', '.5', '5.', '123456789'])('rejects %s', (v) => {
    expect(ok(v)).toBe(false);
  });
});
