import { z } from "zod";
import { maxLength, obj, str } from "./common";

const label = str("label")
  .trim()
  .min(1, "Enter a label")
  .max(40, "label must be shorter than or equal to 40 characters");

// the text inside the QR (read from the owner's screenshot in the browser)
const payload = maxLength("payload", 1000).min(
  1,
  "payload should not be empty",
);

export const createPaymentQrSchema = obj({ label, payload });
export type CreatePaymentQrDto = z.infer<typeof createPaymentQrSchema>;

export const updatePaymentQrSchema = obj({
  label: label.optional(),
  payload: payload.optional(),
});
export type UpdatePaymentQrDto = z.infer<typeof updatePaymentQrSchema>;
