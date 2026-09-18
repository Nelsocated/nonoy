import { Module } from '@nestjs/common';
import { RecountsService } from './recounts.service.js';
import { RecountsController } from './recounts.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module.js';
import { TripsModule } from '../trips/trips.module.js';

@Module({
  imports: [PrismaModule, ActivityLogsModule, TripsModule],
  controllers: [RecountsController],
  providers: [RecountsService],
  exports: [RecountsService],
})
export class RecountsModule {}
