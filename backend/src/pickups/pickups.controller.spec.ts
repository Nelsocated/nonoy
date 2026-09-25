import { Test, TestingModule } from '@nestjs/testing';
import { PickupsController } from './pickups.controller.js';

describe('PickupsController', () => {
  let controller: PickupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PickupsController],
    })
      .useMocker(() => ({})) // auto-mock every dependency
      .compile();

    controller = module.get<PickupsController>(PickupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
