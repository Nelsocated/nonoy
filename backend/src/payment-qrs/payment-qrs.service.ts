import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentQrDto, UpdatePaymentQrDto } from './payment-qrs.dto.js';

export const MAX_PAYMENT_QRS = 10;
const fields = { id: true, label: true, payload: true } as const;

@Injectable()
export class PaymentQrsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.paymentQr.findMany({
      select: fields,
      orderBy: { createdAt: 'asc' },
    });
  }

  create(dto: CreatePaymentQrDto) {
    return this.prisma.$transaction(async (tx) => {
      if ((await tx.paymentQr.count()) >= MAX_PAYMENT_QRS)
        throw new BadRequestException(`Up to ${MAX_PAYMENT_QRS} QR codes`);
      return tx.paymentQr.create({ data: dto, select: fields });
    });
  }

  async update(id: string, dto: UpdatePaymentQrDto) {
    await this.find(id);
    return this.prisma.paymentQr.update({
      where: { id },
      data: dto,
      select: fields,
    });
  }

  // sales only record "QR", never which code — nothing to keep history for
  async remove(id: string) {
    await this.find(id);
    await this.prisma.paymentQr.delete({ where: { id } });
    return { id };
  }

  private async find(id: string) {
    const row = await this.prisma.paymentQr.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('QR code not found');
    return row;
  }
}
