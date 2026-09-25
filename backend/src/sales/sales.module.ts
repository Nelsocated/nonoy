import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller.js';
import { SalesService } from './sales.service.js';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module.js';
import { TripsModule } from '../trips/trips.module.js';

@Module({
  imports: [ActivityLogsModule, TripsModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
