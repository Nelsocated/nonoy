import { Module } from '@nestjs/common';
import { TripsService } from './trips.service.js';
import { TripsController } from './trips.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module.js';
import { TripAccessService } from './trips-access.service.js';

@Module({
  imports: [PrismaModule, ActivityLogsModule],
  controllers: [TripsController],
  providers: [TripsService, TripAccessService],
  // TripAccessService for Pickups/Recounts/Sales; TripsService for Sync
  exports: [TripsService, TripAccessService],
})
export class TripsModule {}
