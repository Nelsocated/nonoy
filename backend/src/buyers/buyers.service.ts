import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBuyerDto, UpdateBuyerDto } from './buyer.dto.js';

@Injectable()
export class BuyersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBuyerDto) {
    return this.prisma.buyer.create({ data: dto });
  }

  async findAll() {
    return this.prisma.buyer.findMany({ orderBy: { name: 'asc' } });
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

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.buyer.delete({ where: { id } });
  }
}
