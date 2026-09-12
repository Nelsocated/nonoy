import { Module } from '@nestjs/common';
import { BuyersService } from './buyers.service.js';
import { BuyersController } from './buyers.controller.js';

@Module({
  controllers: [BuyersController],
  providers: [BuyersService],
})
export class BuyersModule {}
