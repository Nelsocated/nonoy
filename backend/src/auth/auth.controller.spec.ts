import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
    })
      .useMocker(() => ({})) // auto-mock every dependency
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
