import { Module } from '@nestjs/common';
import { PickupsService } from './pickups.service.js';
import { PickupsController } from './pickups.controller.js';

@Module({
  providers: [PickupsService],
  controllers: [PickupsController]
})
export class PickupsModule {}
