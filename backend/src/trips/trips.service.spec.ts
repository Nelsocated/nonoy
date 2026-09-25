import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service.js';

describe('TripsService', () => {
  let service: TripsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TripsService],
    })
      .useMocker(() => ({})) // auto-mock every dependency
      .compile();

    service = module.get<TripsService>(TripsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
