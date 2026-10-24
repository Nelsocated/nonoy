import { z } from "zod";
import { PaymentMethod } from "../generated/prisma/enums";
import { decimalAmount, enumOf, int, isoDate, obj, str, uuid } from "./common";

// Everything a phone records on a trip. Each carries device-made ids
// (clientId, activityLogClientId) so a resend is recognised, not duplicated.

const positiveInt = (f: string) =>
  int(f).positive(`${f} must be a positive number`);

export const createTripSchema = obj({
  clientId: uuid("clientId"),
  startedAt: isoDate("startedAt"),
  createdAtClient: isoDate("createdAtClient"),
});
export type CreateTripDto = z.infer<typeof createTripSchema>;

export const endTripShape = { endedAt: isoDate("endedAt") };
export const endTripSchema = obj(endTripShape);
export type EndTripDto = z.infer<typeof endTripSchema>;

export const createPickupSchema = obj({
  clientId: uuid("clientId"),
  activityLogClientId: uuid("activityLogClientId"),
  tripId: uuid("tripId"),
  plantationId: uuid("plantationId"),
  chickenCount: positiveInt("chickenCount"),
  totalKilo: decimalAmount("totalKilo"),
  createdAtClient: isoDate("createdAtClient"),
});
export type CreatePickupDto = z.infer<typeof createPickupSchema>;

export const createSaleSchema = obj({
  clientId: uuid("clientId"),
  activityLogClientId: uuid("activityLogClientId"),
  tripId: uuid("tripId"),
  buyerId: uuid("buyerId").nullish(),
  // a new buyer the worker typed (sent in the same sync batch, or earlier)
  buyerRequestId: uuid("buyerRequestId").nullish(),
  chickenCount: positiveInt("chickenCount"),
  totalKilo: decimalAmount("totalKilo"),
  amount: decimalAmount("amount"),
  // price actually charged, and the owner's price the phone had; optional so
  // older app versions keep syncing (amount is then taken as-is)
  pricePerKilo: decimalAmount("pricePerKilo").optional(),
  listPricePerKilo: decimalAmount("listPricePerKilo").nullish(),
  // optional so older app versions keep syncing; defaults to CASH
  paymentMethod: enumOf("paymentMethod", [
    PaymentMethod.CASH,
    PaymentMethod.QR,
  ]).nullish(),
  createdAtClient: isoDate("createdAtClient"),
}).superRefine((sale, ctx) => {
  // an owner price without the charged price would skip the kilos × price check
  if (sale.listPricePerKilo !== undefined && sale.pricePerKilo === undefined)
    ctx.addIssue({
      code: "custom",
      path: ["pricePerKilo"],
      message:
        "pricePerKilo must be a non-negative number with up to 2 decimals",
    });
});
export type CreateSaleDto = z.infer<typeof createSaleSchema>;

export const createRecountSchema = obj({
  clientId: uuid("clientId"),
  activityLogClientId: uuid("activityLogClientId"),
  tripId: uuid("tripId"),
  // 0 is valid: everything was sold
  countedChicken: int("countedChicken").min(
    0,
    "countedChicken must not be less than 0",
  ),
  countedKilo: decimalAmount("countedKilo"),
  createdAtClient: isoDate("createdAtClient"),
});
export type CreateRecountDto = z.infer<typeof createRecountSchema>;

export const createExpenseSchema = obj({
  clientId: uuid("clientId"),
  activityLogClientId: uuid("activityLogClientId"),
  // optional: gas bought between trips has no trip
  tripId: uuid("tripId").nullish(),
  description: str("description")
    .min(1, "description should not be empty")
    .max(200, "description must be shorter than or equal to 200 characters"),
  amount: decimalAmount("amount"),
  createdAtClient: isoDate("createdAtClient"),
});
export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;
