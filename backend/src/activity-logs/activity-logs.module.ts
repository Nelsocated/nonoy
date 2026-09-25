import { Module } from '@nestjs/common';
import { ActivityLogsController } from './activity-logs.controller.js';
import { ActivityLogsService } from './activity-logs.service.js';

@Module({
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService],
  exports: [ActivityLogsService], // Trips/Pickups/Sales/Recounts write logs inside their transactions
})
export class ActivityLogsModule {}
