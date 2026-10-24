import { BadRequestException } from "../errors";
import { bool, idParam, obj, str } from "../schemas/common";
import {
  checkProblemSchema,
  dailyReportSchema,
  problemsQuerySchema,
  reportRangeSchema,
  tripsListQuerySchema,
} from "../schemas/reports";
import { syncBatchSchema } from "../schemas/sync";
import {
  createExpenseSchema,
  createPickupSchema,
  createRecountSchema,
  createSaleSchema,
  createTripSchema,
  endTripShape,
} from "../schemas/trip-flow";
import { adminProcedure, authedProcedure, router } from "../trpc";

// Records come from a worker's phone (online, or later through sync) and are
// always saved under the signed-in user; the full lists are staff only.

export const tripsRouter = router({
  start: authedProcedure
    .input(createTripSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.trips.create(input, ctx.user.id),
    ),
  end: authedProcedure
    .input(obj({ id: idParam, ...endTripShape }))
    .mutation(({ ctx, input: { id, ...dto } }) =>
      ctx.services.trips.endTrip(id, dto, ctx.user.id),
    ),
  // a worker's own trip history
  mine: authedProcedure.query(({ ctx }) =>
    ctx.services.trips.findMine(ctx.user.id),
  ),
  list: adminProcedure.query(({ ctx }) => ctx.services.trips.findAll()),
});

export const pickupsRouter = router({
  create: authedProcedure
    .input(createPickupSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.pickups.create(input, ctx.user.id),
    ),
  list: adminProcedure.query(({ ctx }) => ctx.services.pickups.getAll()),
});

export const salesRouter = router({
  create: authedProcedure
    .input(createSaleSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.sales.create(input, ctx.user.id),
    ),
  list: adminProcedure
    .input(obj({ conflicted: bool("conflicted").optional() }).optional())
    .query(({ ctx, input }) =>
      input?.conflicted
        ? ctx.services.sales.findConflicted()
        : ctx.services.sales.getAll(),
    ),
  receipt: adminProcedure
    .input(obj({ clientId: idParam }))
    .query(({ ctx, input }) => ctx.services.sales.receipt(input.clientId)),
});

export const recountsRouter = router({
  create: authedProcedure
    .input(createRecountSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.recounts.create(input, ctx.user.id),
    ),
  list: adminProcedure.query(({ ctx }) => ctx.services.recounts.getAll()),
});

export const expensesRouter = router({
  // online path; offline phones send expenses in the sync batch instead
  create: authedProcedure
    .input(createExpenseSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.expenses.create(input, ctx.user.id),
    ),
  mine: authedProcedure.query(({ ctx }) =>
    ctx.services.expenses.findMine(ctx.user.id),
  ),
  list: adminProcedure.query(({ ctx }) => ctx.services.expenses.getAll()),
});

export const syncRouter = router({
  // A phone's whole offline queue in one go; every item answers for itself.
  push: authedProcedure
    .input(syncBatchSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.sync.processBatch(input, ctx.user.id),
    ),
});

export const reportsRouter = router({
  daily: adminProcedure
    .input(dailyReportSchema.optional())
    .query(({ ctx, input }) => ctx.services.reports.daily(input ?? {})),
  workers: adminProcedure
    .input(reportRangeSchema.optional())
    .query(({ ctx, input }) => ctx.services.reports.byWorker(input ?? {})),
  discrepancies: adminProcedure
    .input(reportRangeSchema.optional())
    .query(({ ctx, input }) => ctx.services.reports.discrepancies(input ?? {})),
  // owner dashboard: trips that haven't ended yet
  openTrips: adminProcedure.query(({ ctx }) =>
    ctx.services.dashboard.openTrips(),
  ),
  // owner dashboard: unchecked problems, 15 per page
  problems: adminProcedure
    .input(problemsQuerySchema.optional())
    .query(({ ctx, input }) =>
      ctx.services.dashboard.problems(input?.page ?? 1),
    ),
  check: adminProcedure
    .input(obj({ kind: str("kind"), id: idParam, ...checkProblemSchema.shape }))
    .mutation(({ ctx, input }) => {
      if (input.kind !== "recount" && input.kind !== "sale")
        throw new BadRequestException("kind must be recount or sale");
      return ctx.services.dashboard.checkProblem(
        input.kind,
        input.id,
        input.note ?? undefined,
        ctx.user.id,
      );
    }),
  // every trip in a month, 15 per page (owner/admin trips screen)
  trips: adminProcedure
    .input(tripsListQuerySchema)
    .query(({ ctx, input }) => ctx.services.reports.tripsList(input)),
  // any role: workers see their own trips (checked in the service)
  trip: authedProcedure
    .input(obj({ id: idParam }))
    .query(({ ctx, input }) =>
      ctx.services.reports.tripDetail(input.id, ctx.user),
    ),
});
