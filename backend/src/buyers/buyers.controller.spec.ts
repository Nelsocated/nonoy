import { Test, TestingModule } from '@nestjs/testing';
import { BuyersController } from './buyers.controller.js';

describe('BuyersController', () => {
  let controller: BuyersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuyersController],
    })
      .useMocker(() => ({})) // auto-mock every dependency
      .compile();

    controller = module.get<BuyersController>(BuyersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
