import type { Prisma } from "../generated/prisma/client";
import { createActivityLogSchema } from "../schemas/activity-logs";
import {
  approveShape,
  mergeBuyerRequestSchema,
} from "../schemas/buyer-requests";
import { idParam, obj } from "../schemas/common";
import { adminProcedure, authedProcedure, router } from "../trpc";

export const activityLogsRouter = router({
  // A phone pushes up logs it kept while offline. Idempotent via the
  // clientId upsert, so retried submissions are safe.
  create: authedProcedure
    .input(createActivityLogSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.tripId)
        await ctx.services.tripAccess.assertOwnership(
          input.tripId,
          ctx.user.id,
        );
      return ctx.services.activityLogs.record({
        ...input,
        payload: input.payload as Prisma.InputJsonValue,
        workerId: ctx.user.id,
      });
    }),
  list: adminProcedure.query(({ ctx }) => ctx.services.activityLogs.getAll()),
});

// New buyers workers typed on sales; phones send them through sync.
export const buyerRequestsRouter = router({
  pending: adminProcedure.query(({ ctx }) =>
    ctx.services.buyerRequests.pending(),
  ),
  // the caller's own, so their phone can name the sales
  mine: authedProcedure.query(({ ctx }) =>
    ctx.services.buyerRequests.mine(ctx.user.id),
  ),
  approve: adminProcedure
    .input(obj({ id: idParam, ...approveShape }))
    .mutation(({ ctx, input: { id, ...dto } }) =>
      ctx.services.buyerRequests.approve(id, dto, ctx.user.id),
    ),
  merge: adminProcedure
    .input(obj({ id: idParam, ...mergeBuyerRequestSchema.shape }))
    .mutation(({ ctx, input }) =>
      ctx.services.buyerRequests.merge(input.id, input.buyerId, ctx.user.id),
    ),
  reject: adminProcedure
    .input(obj({ id: idParam }))
    .mutation(({ ctx, input }) =>
      ctx.services.buyerRequests.reject(input.id, ctx.user.id),
    ),
});
