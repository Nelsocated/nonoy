import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module.js';
import { TripsModule } from '../trips/trips.module.js';

@Module({
  imports: [ActivityLogsModule, TripsModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService], // used by Sync
})
export class ExpensesModule {}
