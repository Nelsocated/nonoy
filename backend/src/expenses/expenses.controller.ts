import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ExpensesService } from './expenses.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/auth.controller.js';
import { CreateExpenseDto } from './expenses.dto.js';

@Controller('expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  // online path; offline devices send expenses in the /sync batch instead
  @Post()
  create(
    @Body() dto: CreateExpenseDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.expensesService.create(dto, req.user.id);
  }

  @Get('me')
  findMine(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.expensesService.findMine(req.user.id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get()
  findAll() {
    return this.expensesService.getAll();
  }
}
