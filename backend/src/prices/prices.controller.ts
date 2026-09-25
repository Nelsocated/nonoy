import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/auth.controller.js';
import { PricesService } from './prices.service.js';
import { CreatePriceDto } from './prices.dto.js';

@Controller('prices')
export class PricesController {
  constructor(private pricesService: PricesService) {}

  // any role — workers' phones keep a copy for offline sales
  @Get('current')
  current() {
    return this.pricesService.current();
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get()
  history() {
    return this.pricesService.history();
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Post()
  create(
    @Body() dto: CreatePriceDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.pricesService.create(req.user.id, dto);
  }
}
