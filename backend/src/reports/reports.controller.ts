import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ReportsService } from './reports.service.js';
import { DashboardService } from './dashboard.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/auth.controller.js';
import {
  CheckProblemDto,
  DailyReportDto,
  ProblemsQueryDto,
  ReportRangeDto,
} from './reports.dto.js';

@Controller('reports')
export class ReportsController {
  constructor(
    private reportsService: ReportsService,
    private dashboardService: DashboardService,
  ) {}

  // owner dashboard: trips that haven't ended yet
  @Roles(Role.OWNER, Role.ADMIN)
  @Get('open-trips')
  openTrips() {
    return this.dashboardService.openTrips();
  }

  // owner dashboard: unchecked problems, 15 per page
  @Roles(Role.OWNER, Role.ADMIN)
  @Get('problems')
  problems(@Query() dto: ProblemsQueryDto) {
    return this.dashboardService.problems(dto.page ?? 1);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Patch('problems/:kind/:id/check')
  checkProblem(
    @Param('kind') kind: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckProblemDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    if (kind !== 'recount' && kind !== 'sale') {
      throw new BadRequestException('kind must be recount or sale');
    }
    return this.dashboardService.checkProblem(kind, id, dto.note, req.user.id);
  }

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
