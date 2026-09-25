import { Test, TestingModule } from '@nestjs/testing';
import { RecountsController } from './recounts.controller.js';

describe('RecountsController', () => {
  let controller: RecountsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecountsController],
    })
      .useMocker(() => ({})) // auto-mock every dependency
      .compile();

    controller = module.get<RecountsController>(RecountsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
