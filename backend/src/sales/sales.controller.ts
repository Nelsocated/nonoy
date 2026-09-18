import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { SalesService } from './sales.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import type { Request } from 'express';
import { CreateSaleDto } from './sales.dto.js';
import { AuthenticatedUser } from '../auth/auth.controller.js';

@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post()
  create(
    @Body() dto: CreateSaleDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.salesService.create(dto, req.user.id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get()
  findAll(@Query('conflicted') conflicted?: string) {
    if (conflicted === 'true') return this.salesService.findConflicted();
    return this.salesService.getAll();
  }
}
