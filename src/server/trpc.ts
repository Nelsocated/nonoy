import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import type { Role } from "./generated/prisma/enums";
import { AppError, zodMessage } from "./errors";
import type { Services } from "./services";

export type CtxUser = { id: string; role: Role };

export type Ctx = {
  user: CtxUser | null;
  /** the caller's IP (Vercel's x-forwarded-for) */
  ip: string;
  /** whose offline queue this request carries, if any */
  offlineUser: string | null;
  /** the database failed while checking the session: don't log them out */
  sessionUnavailable: boolean;
  services: Services;
};

const t = initTRPC.context<Ctx>().create({
  errorFormatter({ shape, error }) {
    if (error.cause instanceof ZodError)
      return { ...shape, message: zodMessage(error.cause) };
    if (error.code === "INTERNAL_SERVER_ERROR")
      return { ...shape, message: "Something went wrong" };
    return shape;
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

// Service errors keep their status and message; anything else is a 500.
const base = t.procedure.use(async ({ ctx, next }) => {
  if (ctx.offlineUser && ctx.user && ctx.user.id !== ctx.offlineUser)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Signed in as a different user",
    });
  const result = await next();
  if (!result.ok && result.error.cause instanceof AppError)
    throw new TRPCError({
      code: result.error.cause.code,
      message: result.error.cause.message,
    });
  return result;
});

export const publicProcedure = base;

export const authedProcedure = base.use(({ ctx, next }) => {
  if (!ctx.user && ctx.sessionUnavailable)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Can't reach the server right now.",
    });
  if (!ctx.user)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// the old @Roles(OWNER, ADMIN)
export const adminProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "OWNER" && ctx.user.role !== "ADMIN")
    throw new TRPCError({ code: "FORBIDDEN", message: "Forbidden resource" });
  return next();
});
