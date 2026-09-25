import { clientTracker } from './client-throttler.guard.js';

const req = (headers: Record<string, string>, ip = '10.0.0.5') => ({ ip, headers });

describe('clientTracker', () => {
  it('uses the forwarded client IP when the Next server proves itself with the secret', () => {
    expect(clientTracker(req({ 'x-internal-secret': 's3cret', 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }), 's3cret'))
      .toBe('203.0.113.7');
  });

  it('ignores X-Forwarded-For without the right secret (direct callers cannot spoof it)', () => {
    expect(clientTracker(req({ 'x-forwarded-for': '1.2.3.4' }), 's3cret')).toBe('10.0.0.5');
    expect(clientTracker(req({ 'x-internal-secret': 'wrong', 'x-forwarded-for': '1.2.3.4' }), 's3cret')).toBe('10.0.0.5');
  });

  it('ignores forwarding entirely when no secret is configured', () => {
    expect(clientTracker(req({ 'x-internal-secret': '', 'x-forwarded-for': '1.2.3.4' }), undefined)).toBe('10.0.0.5');
  });

  it('falls back to the socket IP when the secret matches but no client IP was sent', () => {
    expect(clientTracker(req({ 'x-internal-secret': 's3cret' }), 's3cret')).toBe('10.0.0.5');
  });
});
