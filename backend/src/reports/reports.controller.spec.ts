import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';

describe('ReportsController', () => {
  let controller: ReportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
    })
      .useMocker(() => ({})) // auto-mock every dependency
      .compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('only checks recounts and sales', () => {
    const me = { user: { id: 'me', role: 'OWNER' } } as any;
    expect(() => controller.checkProblem('foo', 'x', {}, me)).toThrow(
      BadRequestException,
    );
  });
});
