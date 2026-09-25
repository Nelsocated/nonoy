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
});
