import { Module } from '@nestjs/common';
import { SyncService } from './sync.service.js';
import { SyncController } from './sync.controller.js';
import { TripsModule } from '../trips/trips.module.js';
import { PickupsModule } from '../pickups/pickups.module.js';
import { SalesModule } from '../sales/sales.module.js';
import { RecountsModule } from '../recounts/recounts.module.js';
import { ExpensesModule } from '../expenses/expenses.module.js';
import { BuyerRequestsModule } from '../buyer-requests/buyer-requests.module.js';

@Module({
  imports: [
    TripsModule,
    PickupsModule,
    SalesModule,
    RecountsModule,
    ExpensesModule,
    BuyerRequestsModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
