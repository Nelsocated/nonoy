import { z } from "zod";
import { isoDate, obj, str, uuid } from "./common";

// the owner can fix what the worker typed when approving
export const approveShape = {
  name: str("name")
    .trim()
    .min(1, "Enter a name")
    .max(100, "name must be shorter than or equal to 100 characters"),
  // an empty place means "no place", not an empty string
  location: str("location")
    .transform((v) => v.trim() || null)
    .pipe(
      z
        .string()
        .max(100, "location must be shorter than or equal to 100 characters")
        .nullable(),
    )
    .nullish(),
};
export const approveBuyerRequestSchema = obj(approveShape);
export type ApproveBuyerRequestDto = z.infer<typeof approveBuyerRequestSchema>;

// from sync: the phone makes the id, so resending the same request is safe
export const createBuyerRequestSchema = obj({
  ...approveShape,
  id: uuid("id"),
  createdAtClient: isoDate("createdAtClient"),
});
export type CreateBuyerRequestDto = z.infer<typeof createBuyerRequestSchema>;

export const mergeBuyerRequestSchema = obj({ buyerId: uuid("buyerId") });
