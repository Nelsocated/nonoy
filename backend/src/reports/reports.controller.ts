import { Controller, Get, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ReportsService } from './reports.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/auth.controller.js';
import { DailyReportDto, ReportRangeDto } from './reports.dto.js';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  // GET /reports/daily?from=2026-09-01&to=2026-09-07[&workerId=...]
  @Roles(Role.OWNER, Role.ADMIN)
  @Get('daily')
  daily(@Query() dto: DailyReportDto) {
    return this.reportsService.daily(dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get('workers')
  byWorker(@Query() dto: ReportRangeDto) {
    return this.reportsService.byWorker(dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get('discrepancies')
  discrepancies(@Query() dto: ReportRangeDto) {
    return this.reportsService.discrepancies(dto);
  }

  // any role — workers can see their own trips (checked in the service)
  @Get('trips/:id')
  tripDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.reportsService.tripDetail(id, req.user);
  }
}
