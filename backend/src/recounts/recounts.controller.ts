import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { RecountsService } from './recounts.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import type { Request } from 'express';
import { AuthenticatedUser } from '../auth/auth.controller.js';
import { CreateRecountDto } from './recounts.dto.js';

@Controller('recounts')
export class RecountsController {
  constructor(private recountsService: RecountsService) {}

  @Post()
  create(
    @Body() dto: CreateRecountDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.recountsService.create(dto, req.user.id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get()
  findAll() {
    return this.recountsService.getAll();
  }
}
