import { Test, TestingModule } from '@nestjs/testing';
import { RecountsService } from './recounts.service.js';

describe('RecountsService', () => {
  let service: RecountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecountsService],
    }).compile();

    service = module.get<RecountsService>(RecountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
