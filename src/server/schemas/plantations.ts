import { z } from "zod";
import { obj, str, trimmedRequired } from "./common";

const name = trimmedRequired("name", "Enter a name");

export const createPlantationSchema = obj({
  name,
  address: str("address").nullish(),
});
export type CreatePlantationDto = z.infer<typeof createPlantationSchema>;

export const updatePlantationSchema = obj({
  name: name.optional(),
  address: str("address").nullish(),
});
export type UpdatePlantationDto = z.infer<typeof updatePlantationSchema>;
