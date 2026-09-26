import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BuyerRequestsService } from './buyer-requests.service.js';

@Module({
  imports: [PrismaModule],
  providers: [BuyerRequestsService],
  exports: [BuyerRequestsService],
})
export class BuyerRequestsModule {}
