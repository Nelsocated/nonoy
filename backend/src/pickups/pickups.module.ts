import { Module } from '@nestjs/common';
import { PickupsService } from './pickups.service.js';
import { PickupsController } from './pickups.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module.js';
import { TripsModule } from '../trips/trips.module.js';

@Module({
  imports: [PrismaModule, ActivityLogsModule, TripsModule],
  controllers: [PickupsController],
  providers: [PickupsService],
  exports: [PickupsService],
})
export class PickupsModule {}
