import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePlantationDto, UpdatePlantationDto } from './plantations.dto.js';

@Injectable()
export class PlantationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePlantationDto) {
    return this.prisma.plantation.create({ data: dto });
  }

  // phones pull the default list, so archived plantations drop off their pick lists
  async findAll(includeArchived = false) {
    return this.prisma.plantation.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: { name: 'asc' },
    });
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

  // no pickups → gone for good; with pickups → archived so history keeps the name
  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.plantation.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Plantation not found');
      const uses = await tx.pickup.count({ where: { plantationId: id } });
      if (uses === 0) {
        await tx.plantation.delete({ where: { id } });
        return { result: 'deleted' as const, uses };
      }
      if (!row.archivedAt)
        await tx.plantation.update({
          where: { id },
          data: { archivedAt: new Date() },
        });
      return { result: 'archived' as const, uses };
    });
  }

  async restore(id: string) {
    await this.findOne(id);
    return this.prisma.plantation.update({
      where: { id },
      data: { archivedAt: null },
    });
  }
}
