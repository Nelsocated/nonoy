import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BuyerRequestsController } from './buyer-requests.controller.js';
import { BuyerRequestsService } from './buyer-requests.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [BuyerRequestsController],
  providers: [BuyerRequestsService],
  exports: [BuyerRequestsService],
})
export class BuyerRequestsModule {}
