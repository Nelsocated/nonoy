import { router } from "../trpc";
import { activityLogsRouter, buyerRequestsRouter } from "./activity";
import { paymentQrsRouter, pricesRouter } from "./prices";
import { buyersRouter, plantationsRouter } from "./reference";
import {
  expensesRouter,
  pickupsRouter,
  recountsRouter,
  reportsRouter,
  salesRouter,
  syncRouter,
  tripsRouter,
} from "./trip-flow";
import { usersRouter } from "./users";

// One sub-router per old Nest controller, same names as the old api.* calls.
export const appRouter = router({
  users: usersRouter,
  buyers: buyersRouter,
  buyerRequests: buyerRequestsRouter,
  plantations: plantationsRouter,
  prices: pricesRouter,
  paymentQrs: paymentQrsRouter,
  trips: tripsRouter,
  pickups: pickupsRouter,
  sales: salesRouter,
  recounts: recountsRouter,
  expenses: expensesRouter,
  activityLogs: activityLogsRouter,
  reports: reportsRouter,
  sync: syncRouter,
});

export type AppRouter = typeof appRouter;
