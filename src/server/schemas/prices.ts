import { z } from "zod";
import { decimalAmount, obj } from "./common";

export const createPriceSchema = obj({
  pricePerKilo: decimalAmount("pricePerKilo"),
});
export type CreatePriceDto = z.infer<typeof createPriceSchema>;
