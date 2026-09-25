import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/enums.js';
import { PricesController } from './prices.controller.js';

describe('PricesController', () => {
  const service = { current: vi.fn(), history: vi.fn(), create: vi.fn() };
  const controller = new PricesController(service as any);
  const roles = (method: keyof PricesController) =>
    new Reflector().get<Role[] | undefined>(
      'roles',
      PricesController.prototype[method],
    );

  it('any signed-in role can read the current price (workers need it offline)', () => {
    expect(roles('current')).toBeUndefined();
  });

  it('only owners and admins can see the history or change the price', () => {
    expect(roles('history')).toEqual([Role.OWNER, Role.ADMIN]);
    expect(roles('create')).toEqual([Role.OWNER, Role.ADMIN]);
  });

  it('create() passes the signed-in user as the setter', async () => {
    await controller.create({ pricePerKilo: '185.50' }, {
      user: { id: 'u9', role: 'OWNER' },
    } as any);
    expect(service.create).toHaveBeenCalledWith('u9', {
      pricePerKilo: '185.50',
    });
  });
});
