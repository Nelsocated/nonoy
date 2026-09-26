import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PaymentQrsController } from './payment-qrs.controller.js';
import { PaymentQrsService } from './payment-qrs.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentQrsController],
  providers: [PaymentQrsService],
})
export class PaymentQrsModule {}
