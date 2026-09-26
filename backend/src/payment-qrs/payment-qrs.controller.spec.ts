import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/enums.js';
import { PaymentQrsController } from './payment-qrs.controller.js';

describe('PaymentQrsController', () => {
  const roles = (method: keyof PaymentQrsController) =>
    new Reflector().get<Role[] | undefined>(
      'roles',
      PaymentQrsController.prototype[method],
    );

  it('any signed-in role can list codes (phones need them offline)', () => {
    expect(roles('list')).toBeUndefined();
  });

  it('only owners and admins can add, change or remove codes', () => {
    for (const m of ['create', 'update', 'remove'] as const)
      expect(roles(m)).toEqual([Role.OWNER, Role.ADMIN]);
  });
});
