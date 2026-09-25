import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogsController } from './activity-logs.controller.js';

describe('ActivityLogsController', () => {
  let controller: ActivityLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityLogsController],
    })
      .useMocker(() => ({})) // auto-mock every dependency
      .compile();

    controller = module.get<ActivityLogsController>(ActivityLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
