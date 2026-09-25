import { Module } from '@nestjs/common';
import { ActivityLogsController } from './activity-logs.controller.js';
import { ActivityLogsService } from './activity-logs.service.js';
import { TripAccessService } from '../trips/trips-access.service.js';

@Module({
  controllers: [ActivityLogsController],
  // provided here rather than importing TripsModule, which already imports this module
  providers: [ActivityLogsService, TripAccessService],
  exports: [ActivityLogsService], // Trips/Pickups/Sales/Recounts write logs inside their transactions
})
export class ActivityLogsModule {}
