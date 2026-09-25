import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';

type Req = { ip?: string; headers: Record<string, string | string[] | undefined> };

const header = (req: Req, name: string) => {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
};

const matches = (given: string | undefined, secret: string) => {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

// The Next frontend calls this API from its own server, so every request shares
// one socket IP. It forwards the browser's IP in X-Forwarded-For and proves it's
// the frontend with X-Internal-Secret; anyone else's X-Forwarded-For is ignored.
export function clientTracker(req: Req, secret: string | undefined) {
  if (secret && matches(header(req, 'x-internal-secret'), secret)) {
    const client = header(req, 'x-forwarded-for')?.split(',')[0]?.trim();
    if (client) return client;
  }
  return req.ip ?? 'unknown';
}

@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return clientTracker(req as Req, process.env.INTERNAL_PROXY_SECRET);
  }
}
