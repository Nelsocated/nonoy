import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { SalesController } from './sales.controller.js';
import { SalesService } from './sales.service.js';

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

  // through the real route (no guards in this module), so the pipe on
  // :clientId is what's tested, not ParseUUIDPipe on its own
  it('receipt rejects an id that is not a UUID', async () => {
    const receipt = vi.fn().mockResolvedValue({ clientId: 'ok' });
    const module = await Test.createTestingModule({
      controllers: [SalesController],
      providers: [{ provide: SalesService, useValue: { receipt } }],
    }).compile();
    const app = module.createNestApplication();
    await app.init();
    try {
      await request(app.getHttpServer()).get('/sales/abc/receipt').expect(400);
      expect(receipt).not.toHaveBeenCalled();
      const id = '3f9a2c7e-1b2d-4c5e-8f90-123456789abc';
      await request(app.getHttpServer())
        .get(`/sales/${id}/receipt`)
        .expect(200);
      expect(receipt).toHaveBeenCalledWith(id);
    } finally {
      await app.close();
    }
  });
});
