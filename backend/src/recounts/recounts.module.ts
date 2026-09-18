import { Module } from '@nestjs/common';
import { RecountsService } from './recounts.service.js';
import { RecountsController } from './recounts.controller.js';

@Module({
  providers: [RecountsService],
  controllers: [RecountsController]
})
export class RecountsModule {}
