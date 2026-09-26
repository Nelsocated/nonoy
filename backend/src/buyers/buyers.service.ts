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

  // no sales or requests → gone for good; otherwise archived so history
  // keeps the name
  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // lock the row: a sale saved meanwhile waits, so it can't slip in
      // between the count and the delete
      await tx.$executeRaw`SELECT 1 FROM buyers WHERE id = ${id} FOR UPDATE`;
      const row = await tx.buyer.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Buyer not found');
      const uses = await tx.sale.count({ where: { buyerId: id } });
      // a new-buyer request that became (or merged into) this buyer keeps the
      // link too: its sales still syncing need it
      const requests = await tx.buyerRequest.count({ where: { buyerId: id } });
      if (uses === 0 && !requests) {
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
