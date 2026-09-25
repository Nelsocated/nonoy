import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { Role } from '../generated/prisma/enums.js';

describe('UsersController', () => {
  let controller: UsersController;
  const users = {
    create: vi.fn(async (_dto, role: Role = Role.WORKER) => ({
      id: 'new',
      role,
    })),
    list: vi.fn(async () => []),
    getProfile: vi.fn(),
    setActive: vi.fn(async (id: string, isActive: boolean) => ({
      id,
      isActive,
    })),
    update: vi.fn(async (id: string, dto: object) => ({ id, ...dto })),
    resetPassword: vi.fn(async (id: string) => ({ id })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: users }],
    }).compile();
    controller = module.get(UsersController);
  });

  const dto = (role: Role) => ({
    phone: '09170000009',
    password: 'secret1',
    name: 'X',
    role,
  });
  const as = (role: Role) => ({ user: { id: 'me', role } }) as any;

  it.each([
    [Role.ADMIN, Role.ADMIN],
    [Role.ADMIN, Role.OWNER],
    [Role.ADMIN, Role.WORKER],
    [Role.OWNER, Role.WORKER],
    [Role.OWNER, Role.OWNER],
    [Role.OWNER, Role.ADMIN],
  ])('%s can create %s', async (me, target) => {
    await expect(controller.create(dto(target), as(me))).resolves.toEqual({
      id: 'new',
      role: target,
    });
    // role is passed separately, not inside the dto
    expect(users.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ role: expect.anything() }),
      target,
    );
  });

  it.each([[Role.WORKER, Role.WORKER]])(
    '%s cannot create %s',
    async (me, target) => {
      expect(() => controller.create(dto(target), as(me))).toThrow(
        ForbiddenException,
      );
      expect(users.create).not.toHaveBeenCalled();
    },
  );

  it('public register always creates a WORKER', async () => {
    await controller.register({
      phone: '09170000009',
      password: 'secret1',
      name: 'X',
    });
    expect(users.create).toHaveBeenCalledWith(expect.anything());
    expect(users.create.mock.calls[0]).toHaveLength(1); // default role = WORKER
  });

  describe('management', () => {
    // owner and admin share one UI and the same powers
    it('ADMIN and OWNER both list every role', async () => {
      await controller.list(as(Role.ADMIN));
      expect(users.list).toHaveBeenLastCalledWith([
        Role.ADMIN,
        Role.OWNER,
        Role.WORKER,
      ]);
      await controller.list(as(Role.OWNER));
      expect(users.list).toHaveBeenLastCalledWith([
        Role.ADMIN,
        Role.OWNER,
        Role.WORKER,
      ]);
    });

    it.each([
      [Role.ADMIN, Role.OWNER],
      [Role.ADMIN, Role.ADMIN],
      [Role.OWNER, Role.WORKER],
      [Role.OWNER, Role.OWNER],
      [Role.OWNER, Role.ADMIN],
    ])('%s can deactivate %s', async (me, target) => {
      users.getProfile.mockResolvedValue({ id: 'u2', role: target });
      await expect(
        controller.setActive('u2', { isActive: false }, as(me)),
      ).resolves.toEqual({ id: 'u2', isActive: false });
    });

    it('edits another user and your own name/phone', async () => {
      users.getProfile.mockResolvedValue({ id: 'u2', role: Role.WORKER });
      await controller.update('u2', { name: 'New' }, as(Role.OWNER));
      expect(users.update).toHaveBeenCalledWith('u2', { name: 'New' });
      users.getProfile.mockResolvedValue({ id: 'me', role: Role.OWNER });
      await controller.update('me', { phone: '09171234567' }, as(Role.OWNER));
      expect(users.update).toHaveBeenLastCalledWith('me', {
        phone: '09171234567',
      });
    });

    it('resets another user’s password but never your own', async () => {
      users.getProfile.mockResolvedValue({ id: 'u2', role: Role.ADMIN });
      await controller.resetPassword(
        'u2',
        { password: 'newpass' },
        as(Role.OWNER),
      );
      expect(users.resetPassword).toHaveBeenCalledWith('u2', 'newpass');
      await expect(
        controller.resetPassword('me', { password: 'newpass' }, as(Role.ADMIN)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nobody can deactivate themselves', async () => {
      await expect(
        controller.setActive('me', { isActive: false }, as(Role.ADMIN)),
      ).rejects.toThrow(ForbiddenException);
      expect(users.setActive).not.toHaveBeenCalled();
    });
  });
});
