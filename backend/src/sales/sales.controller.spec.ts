import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SalesController } from './sales.controller.js';

describe('SalesController', () => {
  let controller: SalesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesController],
    })
      .useMocker(() => ({})) // auto-mock every dependency
      .compile();

    controller = module.get<SalesController>(SalesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('receipt is for owner/admin only', () => {
    expect(
      Reflect.getMetadata('roles', SalesController.prototype.receipt),
    ).toEqual(['OWNER', 'ADMIN']);
  });

  it('receipt rejects an id that is not a UUID', async () => {
    const pipe = new ParseUUIDPipe();
    await expect(
      pipe.transform('abc', { type: 'param', data: 'clientId' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
