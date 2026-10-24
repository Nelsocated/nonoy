import type { Db } from "../db";
import { ActivityLogsService } from "./activity-logs";
import { BuyerRequestsService } from "./buyer-requests";
import { BuyersService } from "./buyers";
import { PaymentQrsService } from "./payment-qrs";
import { PlantationsService } from "./plantations";
import { PricesService } from "./prices";
import { TripAccessService } from "./trip-access";
import { UsersService } from "./users";

// Every service, wired once per request context (they're stateless).
export function createServices(db: Db) {
  return {
    users: new UsersService(db),
    buyers: new BuyersService(db),
    buyerRequests: new BuyerRequestsService(db),
    plantations: new PlantationsService(db),
    prices: new PricesService(db),
    paymentQrs: new PaymentQrsService(db),
    activityLogs: new ActivityLogsService(db),
    tripAccess: new TripAccessService(db),
  };
}

export type Services = ReturnType<typeof createServices>;
