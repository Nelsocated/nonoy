import { Test, TestingModule } from '@nestjs/testing';
import { PlantationsService } from './plantations.service.js';

describe('PlantationsService', () => {
  let service: PlantationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlantationsService],
    }).compile();

    service = module.get<PlantationsService>(PlantationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
