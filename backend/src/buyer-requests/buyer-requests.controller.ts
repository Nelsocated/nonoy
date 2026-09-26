import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedUser } from '../auth/auth.controller.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import {
  ApproveBuyerRequestDto,
  MergeBuyerRequestDto,
} from './buyer-requests.dto.js';
import { BuyerRequestsService } from './buyer-requests.service.js';

type Authed = Request & { user: AuthenticatedUser };

// New buyers workers typed on sales; phones send them through /sync
@Controller('buyer-requests')
export class BuyerRequestsController {
  constructor(private service: BuyerRequestsService) {}

  @Roles(Role.OWNER, Role.ADMIN)
  @Get()
  pending() {
    return this.service.pending();
  }

  // the caller's own, so their phone can name the sales
  @Get('mine')
  mine(@Req() req: Authed) {
    return this.service.mine(req.user.id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveBuyerRequestDto,
    @Req() req: Authed,
  ) {
    return this.service.approve(id, dto, req.user.id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Post(':id/merge')
  merge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MergeBuyerRequestDto,
    @Req() req: Authed,
  ) {
    return this.service.merge(id, dto.buyerId, req.user.id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Post(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @Req() req: Authed) {
    return this.service.reject(id, req.user.id);
  }
}
