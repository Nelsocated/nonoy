import { z } from "zod";
import { obj, str, trimmedRequired } from "./common";

const name = trimmedRequired("name", "Enter a name");

export const createBuyerSchema = obj({
  name,
  location: str("location").nullish(),
  notes: str("notes").nullish(),
});
export type CreateBuyerDto = z.infer<typeof createBuyerSchema>;

// a PATCH may leave the name out, but not clear it
export const updateBuyerSchema = obj({
  name: name.optional(),
  location: str("location").nullish(),
  notes: str("notes").nullish(),
});
export type UpdateBuyerDto = z.infer<typeof updateBuyerSchema>;
