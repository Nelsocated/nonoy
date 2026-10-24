import { createPriceSchema } from "../schemas/prices";
import {
  createPaymentQrSchema,
  updatePaymentQrSchema,
} from "../schemas/payment-qrs";
import { idParam, obj } from "../schemas/common";
import { adminProcedure, authedProcedure, router } from "../trpc";

export const pricesRouter = router({
  // any role: phones keep a copy for offline sales; null before any is set
  current: authedProcedure.query(
    async ({ ctx }) => (await ctx.services.prices.current()) ?? null,
  ),
  history: adminProcedure.query(({ ctx }) => ctx.services.prices.history()),
  set: adminProcedure
    .input(createPriceSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.prices.create(ctx.user.id, input),
    ),
});

export const paymentQrsRouter = router({
  // any signed-in role: phones pull these to show them offline
  list: authedProcedure.query(({ ctx }) => ctx.services.paymentQrs.list()),
  create: adminProcedure
    .input(createPaymentQrSchema)
    .mutation(({ ctx, input }) => ctx.services.paymentQrs.create(input)),
  update: adminProcedure
    .input(obj({ id: idParam, ...updatePaymentQrSchema.shape }))
    .mutation(({ ctx, input: { id, ...dto } }) =>
      ctx.services.paymentQrs.update(id, dto),
    ),
  remove: adminProcedure
    .input(obj({ id: idParam }))
    .mutation(({ ctx, input }) => ctx.services.paymentQrs.remove(input.id)),
});
