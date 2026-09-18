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
  exports: [TripAccessService], // this is what Pickups/Recounts/Sales import
})
export class TripsModule {}
