import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PlantationsModule } from './plantations/plantations.module.js';
import { BuyersModule } from './buyers/buyers.module.js';
import { TripsModule } from './trips/trips.module.js';
import { SyncModule } from './sync/sync.module.js';
import { ReportsModule } from './reports/reports.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    PlantationsModule,
    BuyersModule,
    TripsModule,
    SyncModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
