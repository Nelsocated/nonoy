import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';

describe('AuthService', () => {
  let service: AuthService;
  // in-memory stand-in for the users table
  let db: Record<string, any>;
  const users = {
    findByPhone: vi.fn(
      async (phone: string) =>
        Object.values(db).find((u) => u.phone === phone) ?? null,
    ),
    findById: vi.fn(async (id: string) => db[id] ?? null),
    updateRefreshTokenHash: vi.fn(
      async (id: string, h: string | null, previous: string | null = null) => {
        db[id].refreshTokenHash = h;
        db[id].previousRefreshTokenHash = previous;
        db[id].refreshRotatedAt = previous ? new Date() : null;
      },
    ),
  };

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access';
    process.env.JWT_REFRESH_SECRET = 'test-refresh';
    process.env.JWT_ACCESS_EXPIRY = '15m';
    process.env.JWT_REFRESH_EXPIRY = '7d';
  });

  beforeEach(async () => {
    db = {
      u1: {
        id: 'u1',
        name: 'Ana',
        phone: '09170000001',
        role: 'WORKER',
        isActive: true,
        passwordHash: await bcrypt.hash('secret1', 4),
        refreshTokenHash: null,
        previousRefreshTokenHash: null,
        refreshRotatedAt: null,
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: UsersService, useValue: users },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  describe('validateUser', () => {
    it('returns the user without secrets on a correct password', async () => {
      const u = await service.validateUser({
        phone: '09170000001',
        password: 'secret1',
      });
      expect(u).toMatchObject({ id: 'u1', role: 'WORKER' });
      expect(u).not.toHaveProperty('passwordHash');
      expect(u).not.toHaveProperty('refreshTokenHash');
    });

    it('rejects a wrong password', async () => {
      expect(
        await service.validateUser({ phone: '09170000001', password: 'nope' }),
      ).toBeNull();
    });

    it('rejects an inactive user', async () => {
      db.u1.isActive = false;
      expect(
        await service.validateUser({
          phone: '09170000001',
          password: 'secret1',
        }),
      ).toBeNull();
    });
  });

  describe('refresh', () => {
    afterEach(() => vi.useRealTimers());

    it('rotates: the new token works and keeps working', async () => {
      const { refreshToken: first } = await service.login(db.u1);
      const { refreshToken: second } = await service.refresh(first);

      expect(second).not.toBe(first);
      await expect(service.refresh(second!)).resolves.toHaveProperty(
        'accessToken',
      );
    });

    // Two requests racing to refresh with the same cookie: the loser presents the
    // just-rotated token. It gets an access token but no new refresh token, so it
    // can't rotate again and knock out the winner's token.
    it('accepts the just-rotated token for a short grace window, without rotating', async () => {
      const { refreshToken: first } = await service.login(db.u1);
      const { refreshToken: second } = await service.refresh(first);

      const late = await service.refresh(first);
      expect(late.accessToken).toEqual(expect.any(String));
      expect(late.refreshToken).toBeNull();
      await expect(service.refresh(second!)).resolves.toHaveProperty(
        'accessToken',
      );
    });

    it('rejects the old token once the grace window has passed', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const { refreshToken: first } = await service.login(db.u1);
      await service.refresh(first);

      vi.setSystemTime(Date.now() + 11_000);
      await expect(service.refresh(first)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('gives no grace after logout', async () => {
      const { refreshToken: first } = await service.login(db.u1);
      await service.refresh(first);
      await service.logout('u1');
      await expect(service.refresh(first)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('two tokens issued back-to-back are distinct (bcrypt 72-byte trap)', async () => {
      const a = (await service.login(db.u1)).refreshToken;
      const b = (await service.login(db.u1)).refreshToken;
      expect(a).not.toBe(b);
      await expect(service.refresh(a)).rejects.toThrow(UnauthorizedException);
    });

    it('is rejected after logout', async () => {
      const { refreshToken } = await service.login(db.u1);
      await service.logout('u1');
      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('is rejected for an inactive user', async () => {
      const { refreshToken } = await service.login(db.u1);
      db.u1.isActive = false;
      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects garbage', async () => {
      await expect(service.refresh('not-a-jwt')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
