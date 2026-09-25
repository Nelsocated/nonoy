import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { DashboardService } from './dashboard.service.js';
import { TripsModule } from '../trips/trips.module.js';

@Module({
  imports: [TripsModule],
  controllers: [ReportsController],
  providers: [ReportsService, DashboardService],
})
export class ReportsModule {}
