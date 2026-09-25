import { BadRequestException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePriceDto } from './prices.dto.js';

const setBy = { select: { id: true, name: true } };

// The owner's price per kilo. Every change is a new row, so the newest row is
// the current price and the rest are history.
@Injectable()
export class PricesService {
  constructor(private prisma: PrismaService) {}

  current() {
    return this.prisma.price.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { setBy },
    });
  }

  history() {
    return this.prisma.price.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { setBy },
    });
  }

  async create(setById: string, dto: CreatePriceDto) {
    if (new Decimal(dto.pricePerKilo).lte(0)) {
      throw new BadRequestException('Price must be more than 0');
    }
    return this.prisma.price.create({
      data: { pricePerKilo: dto.pricePerKilo, setById },
      include: { setBy },
    });
  }
}
