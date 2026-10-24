import { z } from "zod";
import { minLength, obj } from "./common";

export const authSchema = obj({
  phone: minLength("phone", 11, "Insert a valid phone number"),
  password: minLength("password", 6),
});
export type AuthDto = z.infer<typeof authSchema>;
