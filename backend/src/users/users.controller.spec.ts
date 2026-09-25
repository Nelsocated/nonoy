import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { Role } from '../generated/prisma/enums.js';

describe('UsersController', () => {
  let controller: UsersController;
  const users = { create: vi.fn(async (_dto, role: Role = Role.WORKER) => ({ id: 'new', role })) };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: users }],
    }).compile();
    controller = module.get(UsersController);
  });

  const dto = (role: Role) => ({ phone: '09170000009', password: 'secret1', name: 'X', role });
  const as = (role: Role) => ({ user: { id: 'me', role } }) as any;

  it.each([
    [Role.ADMIN, Role.ADMIN],
    [Role.ADMIN, Role.OWNER],
    [Role.ADMIN, Role.WORKER],
    [Role.OWNER, Role.WORKER],
  ])('%s can create %s', async (me, target) => {
    await expect(controller.create(dto(target), as(me))).resolves.toEqual({ id: 'new', role: target });
    // role is passed separately, not inside the dto
    expect(users.create).toHaveBeenCalledWith(expect.not.objectContaining({ role: expect.anything() }), target);
  });

  it.each([
    [Role.OWNER, Role.OWNER],
    [Role.OWNER, Role.ADMIN],
    [Role.WORKER, Role.WORKER],
  ])('%s cannot create %s', async (me, target) => {
    expect(() => controller.create(dto(target), as(me))).toThrow(ForbiddenException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('public register always creates a WORKER', async () => {
    await controller.register({ phone: '09170000009', password: 'secret1', name: 'X' });
    expect(users.create).toHaveBeenCalledWith(expect.anything());
    expect(users.create.mock.calls[0]).toHaveLength(1); // default role = WORKER
  });
});
