import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = { user: { findUnique: vi.fn(), update: vi.fn() } };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
  });

  it('keeps the same phone without a false conflict', async () => {
    prisma.user.findUnique.mockImplementation(async ({ where }) =>
      where.id ? { id: 'u1' } : { id: 'u1', phone: '09170000001' },
    );
    await service.update('u1', { phone: '09170000001', name: 'A' });
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('rejects a phone another user has', async () => {
    prisma.user.findUnique.mockImplementation(async ({ where }) =>
      where.id ? { id: 'u1' } : { id: 'u2', phone: '09170000002' },
    );
    await expect(
      service.update('u1', { phone: '09170000002' }),
    ).rejects.toThrow(
      new ConflictException('That phone number is already used'),
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('404s for an unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.update('x', { name: 'A' })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.resetPassword('x', 'secret1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('password reset hashes it and logs the user out everywhere', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    await service.resetPassword('u1', 'secret1');
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(data).toMatchObject({
      refreshTokenHash: null,
      previousRefreshTokenHash: null,
      refreshRotatedAt: null,
    });
  });
});
