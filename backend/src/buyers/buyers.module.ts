import { Module } from '@nestjs/common';
import { BuyersService } from './buyers.service.js';
import { BuyersController } from './buyers.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [BuyersController],
  providers: [BuyersService],
  exports: [BuyersService],
})
export class BuyersModule {}
