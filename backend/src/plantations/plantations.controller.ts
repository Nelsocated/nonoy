import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { PlantationsService } from './plantations.service.js';
import { CreatePlantationDto, UpdatePlantationDto } from './plantations.dto.js';

@Controller('plantations')
export class PlantationsController {
  constructor(private plantationsService: PlantationsService) {}

  // Workers need this list to pick a plantation when recording a pickup
  @Get()
  findAll() {
    return this.plantationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plantationsService.findOne(id);
  }

  // Adding a new plantation source — owner/admin only, unlike Buyer
  // (a new plantation is a business relationship, not a walk-up customer
  // a worker meets mid-route)
  @Roles(Role.OWNER, Role.ADMIN)
  @Post()
  create(@Body() dto: CreatePlantationDto) {
    return this.plantationsService.create(dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlantationDto) {
    return this.plantationsService.update(id, dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.plantationsService.remove(id);
  }
}
