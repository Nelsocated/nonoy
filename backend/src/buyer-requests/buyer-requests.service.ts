import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBuyerRequestDto } from './buyer-requests.dto.js';

const DAY = 24 * 60 * 60 * 1000;
// how far back a phone keeps its own decided requests
const MINE_DAYS = 60;

@Injectable()
export class BuyerRequestsService {
  constructor(private prisma: PrismaService) {}

  // from /sync; the phone made the id, so a resend returns the saved one
  async create(dto: CreateBuyerRequestDto, userId: string) {
    const existing = await this.prisma.buyerRequest.findUnique({
      where: { id: dto.id },
    });
    if (existing) {
      if (existing.requestedById !== userId)
        throw new ForbiddenException('Not your buyer request');
      return existing;
    }
    return this.prisma.buyerRequest.create({
      data: {
        id: dto.id,
        name: dto.name,
        location: dto.location ?? null,
        requestedById: userId,
        createdAtClient: new Date(dto.createdAtClient),
      },
    });
  }

  // the caller's own, for their phone: recent ones, and every one still
  // waiting (so its sales never turn into "Walk-in" on the phone)
  async mine(userId: string, now = new Date()) {
    return this.prisma.buyerRequest.findMany({
      where: {
        requestedById: userId,
        OR: [
          { status: 'PENDING' },
          {
            createdAtClient: {
              gte: new Date(now.getTime() - MINE_DAYS * DAY),
            },
          },
        ],
      },
      orderBy: { createdAtClient: 'desc' },
      select: {
        id: true,
        name: true,
        location: true,
        status: true,
        buyerId: true,
        createdAtClient: true,
      },
    });
  }
}
