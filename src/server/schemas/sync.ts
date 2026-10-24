import { z } from "zod";
import { createBuyerRequestSchema } from "./buyer-requests";
import { array, obj, uuid } from "./common";
import {
  createExpenseSchema,
  createPickupSchema,
  createRecountSchema,
  createSaleSchema,
  createTripSchema,
  endTripShape,
} from "./trip-flow";

// a trip ending names its trip (the online version had it in the URL)
const endTripSyncSchema = obj({ ...endTripShape, tripId: uuid("tripId") });

const list = <T extends z.ZodType>(f: string, item: T) =>
  array(f, item).nullish();

export const syncBatchSchema = obj({
  trips: list("trips", createTripSchema),
  tripEndings: list("tripEndings", endTripSyncSchema),
  pickups: list("pickups", createPickupSchema),
  buyerRequests: list("buyerRequests", createBuyerRequestSchema),
  sales: list("sales", createSaleSchema),
  recounts: list("recounts", createRecountSchema),
  expenses: list("expenses", createExpenseSchema),
});
export type SyncBatchDto = z.infer<typeof syncBatchSchema>;
