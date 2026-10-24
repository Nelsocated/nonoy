import type { Db } from "../db";
import { ActivityLogsService } from "./activity-logs";
import { BuyerRequestsService } from "./buyer-requests";
import { BuyersService } from "./buyers";
import { DashboardService } from "./dashboard";
import { ExpensesService } from "./expenses";
import { PaymentQrsService } from "./payment-qrs";
import { PickupsService } from "./pickups";
import { PlantationsService } from "./plantations";
import { PricesService } from "./prices";
import { RecountsService } from "./recounts";
import { ReportsService } from "./reports";
import { SalesService } from "./sales";
import { SyncService } from "./sync";
import { TripAccessService } from "./trip-access";
import { TripsService } from "./trips";
import { UsersService } from "./users";

// Every service, wired once per request context (they're stateless), in the
// same dependency order the Nest modules had.
export function createServices(db: Db) {
  const activityLogs = new ActivityLogsService(db);
  const tripAccess = new TripAccessService(db);
  const buyerRequests = new BuyerRequestsService(db);
  const trips = new TripsService(db, activityLogs, tripAccess);
  const pickups = new PickupsService(db, activityLogs, tripAccess);
  const sales = new SalesService(db, activityLogs, tripAccess);
  const recounts = new RecountsService(db, activityLogs, tripAccess);
  const expenses = new ExpensesService(db, activityLogs, tripAccess);
  return {
    users: new UsersService(db),
    buyers: new BuyersService(db),
    buyerRequests,
    plantations: new PlantationsService(db),
    prices: new PricesService(db),
    paymentQrs: new PaymentQrsService(db),
    activityLogs,
    tripAccess,
    trips,
    pickups,
    sales,
    recounts,
    expenses,
    sync: new SyncService(
      trips,
      pickups,
      sales,
      recounts,
      expenses,
      buyerRequests,
    ),
    reports: new ReportsService(db, tripAccess),
    dashboard: new DashboardService(db),
  };
}

export type Services = ReturnType<typeof createServices>;
