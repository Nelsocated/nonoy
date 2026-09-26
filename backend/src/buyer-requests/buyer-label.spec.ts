import { saleBuyerName } from './buyer-label.js';

describe('saleBuyerName', () => {
  it('the buyer wins', () => {
    expect(
      saleBuyerName(
        { name: 'Aling Nena' },
        { name: 'Nena', status: 'APPROVED' },
      ),
    ).toBe('Aling Nena');
  });
  it('a waiting request shows as waiting', () => {
    expect(saleBuyerName(null, { name: 'Nena', status: 'PENDING' })).toBe(
      'Nena (waiting)',
    );
  });
  it('rejected or none → null (walk-in)', () => {
    expect(
      saleBuyerName(null, { name: 'Nena', status: 'REJECTED' }),
    ).toBeNull();
    expect(saleBuyerName(null, null)).toBeNull();
  });
});
