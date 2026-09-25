import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBuyerDto, UpdateBuyerDto } from './buyer.dto.js';

@Injectable()
export class BuyersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBuyerDto) {
    return this.prisma.buyer.create({ data: dto });
  }

  // phones pull the default list, so archived buyers drop off their pick lists
  async findAll(includeArchived = false) {
    return this.prisma.buyer.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const buyer = await this.prisma.buyer.findUnique({ where: { id } });
    if (!buyer) throw new NotFoundException('Buyer not found');
    return buyer;
  }

  async update(id: string, dto: UpdateBuyerDto) {
    await this.findOne(id);
    return this.prisma.buyer.update({ where: { id }, data: dto });
  }

  // no sales → gone for good; with sales → archived so history keeps the name
  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.buyer.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Buyer not found');
      const uses = await tx.sale.count({ where: { buyerId: id } });
      if (uses === 0) {
        await tx.buyer.delete({ where: { id } });
        return { result: 'deleted' as const, uses };
      }
      if (!row.archivedAt)
        await tx.buyer.update({
          where: { id },
          data: { archivedAt: new Date() },
        });
      return { result: 'archived' as const, uses };
    });
  }

  async restore(id: string) {
    await this.findOne(id);
    return this.prisma.buyer.update({
      where: { id },
      data: { archivedAt: null },
    });
  }
}
