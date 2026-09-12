import { Module } from '@nestjs/common';
import { PlantationsService } from './plantations.service.js';
import { PlantationsController } from './plantations.controller.js';

@Module({
  providers: [PlantationsService],
  controllers: [PlantationsController]
})
export class PlantationsModule {}
