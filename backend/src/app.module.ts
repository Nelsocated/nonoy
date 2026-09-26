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
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guard/auth.guard.js';
import { RolesGuard } from './auth/guard/roles.guard.js';
import { PickupsModule } from './pickups/pickups.module.js';
import { SalesModule } from './sales/sales.module.js';
import { RecountsModule } from './recounts/recounts.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { ActivityLogsModule } from './activity-logs/activity-logs.module.js';
import { PricesModule } from './prices/prices.module.js';
import { PaymentQrsModule } from './payment-qrs/payment-qrs.module.js';

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
    PickupsModule,
    SalesModule,
    RecountsModule,
    ExpensesModule,
    ActivityLogsModule,
    PricesModule,
    PaymentQrsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
