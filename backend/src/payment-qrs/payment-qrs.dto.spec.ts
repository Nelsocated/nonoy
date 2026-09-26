import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreatePaymentQrDto, UpdatePaymentQrDto } from './payment-qrs.dto.js';

const errors = (cls: new () => object, body: object) =>
  validateSync(plainToInstance(cls, body)).map((e) => e.property);

describe('payment QR input', () => {
  it('accepts a label and the QR text, trimming the label', () => {
    const dto = plainToInstance(CreatePaymentQrDto, {
      label: '  GCash ',
      payload: '000201010211',
    });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.label).toBe('GCash');
  });

  it.each(['', '   '])('rejects blank label %j', (label) => {
    expect(errors(CreatePaymentQrDto, { label, payload: 'x' })).toContain(
      'label',
    );
  });

  it('rejects a label over 40 and a payload over 1000 characters', () => {
    expect(
      errors(CreatePaymentQrDto, { label: 'a'.repeat(41), payload: 'x' }),
    ).toContain('label');
    expect(
      errors(CreatePaymentQrDto, { label: 'GCash', payload: 'x'.repeat(1001) }),
    ).toContain('payload');
  });

  it('rejects an empty payload', () => {
    expect(
      errors(CreatePaymentQrDto, { label: 'GCash', payload: '' }),
    ).toContain('payload');
  });

  it('update may change just one field', () => {
    expect(errors(UpdatePaymentQrDto, { label: 'Maya' })).toEqual([]);
  });
});
