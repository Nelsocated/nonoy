import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Prisma } from '../generated/prisma/client.js';
import { BuyerRequestStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ApproveBuyerRequestDto,
  CreateBuyerRequestDto,
} from './buyer-requests.dto.js';

const DAY = 24 * 60 * 60 * 1000;
// how far back a phone keeps its own decided requests
const MINE_DAYS = 60;

@Injectable()
export class BuyerRequestsService {
  constructor(private prisma: PrismaService) {}

  // from /sync; the phone made the id, so a resend returns the saved one
  async create(dto: CreateBuyerRequestDto, userId: string) {
    const existing = await this.saved(dto.id, userId);
    if (existing) return existing;
    try {
      return await this.prisma.buyerRequest.create({
        data: {
          id: dto.id,
          name: dto.name,
          location: dto.location ?? null,
          requestedById: userId,
          createdAtClient: new Date(dto.createdAtClient),
        },
      });
    } catch (err) {
      // two sends at once (a resend while the first was still running):
      // the other one saved it, so answer with that row
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const row = await this.saved(dto.id, userId);
        if (row) return row;
      }
      throw err;
    }
  }

  private async saved(id: string, userId: string) {
    const row = await this.prisma.buyerRequest.findUnique({ where: { id } });
    if (row && row.requestedById !== userId)
      throw new ForbiddenException('Not your buyer request');
    return row;
  }

  // the caller's own, for their phone: every one still waiting (so its
  // sales never turn into "Walk-in"), and ones asked or decided lately (so
  // an old request decided today stops showing as waiting)
  async mine(userId: string, now = new Date()) {
    const since = new Date(now.getTime() - MINE_DAYS * DAY);
    return this.prisma.buyerRequest.findMany({
      where: {
        requestedById: userId,
        OR: [
          { status: 'PENDING' },
          { createdAtClient: { gte: since } },
          { decidedAt: { gte: since } },
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

  // what the owner still has to decide, oldest first
  async pending() {
    const rows = await this.prisma.buyerRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAtClient: 'asc' },
      select: {
        id: true,
        name: true,
        location: true,
        createdAtClient: true,
        requestedBy: { select: { id: true, name: true } },
        _count: { select: { sales: true } },
      },
    });
    return rows.map(({ _count, ...r }) => ({ ...r, sales: _count.sales }));
  }

  approve(id: string, dto: ApproveBuyerRequestDto, userId: string) {
    return this.decide(id, async (tx) => {
      const buyer = await tx.buyer.create({
        data: { name: dto.name, location: dto.location ?? null },
      });
      return this.settle(tx, id, BuyerRequestStatus.APPROVED, buyer.id, userId);
    });
  }

  // it's really a buyer already in the list
  merge(id: string, buyerId: string, userId: string) {
    return this.decide(id, async (tx) => {
      const buyer = await tx.buyer.findUnique({ where: { id: buyerId } });
      if (!buyer || buyer.archivedAt)
        throw new BadRequestException('Pick an active buyer');
      return this.settle(tx, id, BuyerRequestStatus.MERGED, buyer.id, userId);
    });
  }

  // its sales stay walk-in
  reject(id: string, userId: string) {
    return this.decide(id, (tx) =>
      this.settle(tx, id, BuyerRequestStatus.REJECTED, null, userId),
    );
  }

  // One decision, all at once. The row lock makes a second decision (and a
  // sale joining this request) wait, then see it's no longer PENDING.
  private decide<T>(
    id: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM buyer_requests WHERE id = ${id} FOR UPDATE`;
      const request = await tx.buyerRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Buyer request not found');
      if (request.status !== BuyerRequestStatus.PENDING)
        throw new ConflictException('Already decided');
      return fn(tx);
    });
  }

  private async settle(
    tx: Prisma.TransactionClient,
    id: string,
    status: BuyerRequestStatus,
    buyerId: string | null,
    userId: string,
  ) {
    if (buyerId)
      await tx.sale.updateMany({
        where: { buyerRequestId: id },
        data: { buyerId },
      });
    return tx.buyerRequest.update({
      where: { id },
      data: { status, buyerId, decidedById: userId, decidedAt: new Date() },
      include: { buyer: true },
    });
  }
}
