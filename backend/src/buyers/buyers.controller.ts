import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { BuyersService } from './buyers.service.js';
import { CreateBuyerDto, UpdateBuyerDto } from './buyer.dto.js';
import { Role } from '../generated/prisma/enums.js';

@Controller('buyers')
export class BuyersController {
  constructor(private buyersService: BuyersService) {}

  // Any authenticated user (worker included) can look up/create buyers —
  // needed for recording sales on the road
  // ?include=archived adds removed ones: the owner/admin screen, and phones
  // (so past sales keep their buyer names; the sale form hides them)
  @Get()
  findAll(@Query('include') include?: string) {
    return this.buyersService.findAll(include === 'archived');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.buyersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBuyerDto) {
    return this.buyersService.create(dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBuyerDto) {
    return this.buyersService.update(id, dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.buyersService.remove(id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.buyersService.restore(id);
  }
}
