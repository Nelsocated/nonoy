import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePlantationDto, UpdatePlantationDto } from './plantations.dto.js';

@Injectable()
export class PlantationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePlantationDto) {
    return this.prisma.plantation.create({ data: dto });
  }

  async findAll() {
    return this.prisma.plantation.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const plantation = await this.prisma.plantation.findUnique({
      where: { id },
    });
    if (!plantation) throw new NotFoundException('Plantation not found');
    return plantation;
  }

  async update(id: string, dto: UpdatePlantationDto) {
    await this.findOne(id);
    return this.prisma.plantation.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.plantation.delete({ where: { id } });
  }
}
