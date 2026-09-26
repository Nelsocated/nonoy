import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/enums.js';
import { BuyerRequestsController } from './buyer-requests.controller.js';

describe('BuyerRequestsController', () => {
  const roles = (method: keyof BuyerRequestsController) =>
    new Reflector().get<Role[] | undefined>(
      'roles',
      BuyerRequestsController.prototype[method],
    );

  it('any signed-in user reads their own requests (phones)', () => {
    expect(roles('mine')).toBeUndefined();
  });

  it('only owners and admins see and decide requests', () => {
    for (const m of ['pending', 'approve', 'merge', 'reject'] as const)
      expect(roles(m)).toEqual([Role.OWNER, Role.ADMIN]);
  });
});
