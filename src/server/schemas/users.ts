import { z } from "zod";
import { Role } from "../generated/prisma/enums";
import { bool, enumOf, minLength, obj, trimmedRequired } from "./common";

const phone = minLength("phone", 11, "Insert a valid phone number");

// bcrypt only uses the first 72 bytes: longer would be silently cut off
const password = minLength("password", 6).refine(
  (v) => new TextEncoder().encode(v).length <= 72,
  "Use a shorter password (72 characters at most)",
);

const name = trimmedRequired("name", "Enter a name");

export const createUserShape = { phone, password, name };
export const createUserSchema = obj(createUserShape);
export type CreateUserDto = z.infer<typeof createUserSchema>;

// users.create — staff creating an account with a chosen role
export const adminCreateUserSchema = obj({
  ...createUserShape,
  role: enumOf("role", [Role.OWNER, Role.WORKER, Role.ADMIN]),
});

export const setActiveSchema = obj({ isActive: bool("isActive") });

// fix a name or change the login phone
export const updateUserSchema = obj({
  name: name.optional(),
  phone: phone.optional(),
});

// staff set a new password when a worker forgets theirs
export const resetPasswordSchema = obj({ password });
