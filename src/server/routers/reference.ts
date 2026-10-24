import { bool, idParam, obj } from "../schemas/common";
import { createBuyerSchema, updateBuyerSchema } from "../schemas/buyers";
import {
  createPlantationSchema,
  updatePlantationSchema,
} from "../schemas/plantations";
import { adminProcedure, authedProcedure, router } from "../trpc";

const byId = obj({ id: idParam });
// the owner/admin screens (and phones, for old names) also want removed ones
const listInput = obj({ archived: bool("archived").optional() }).optional();

// Any signed-in user (worker included) can look up and add buyers: needed
// for recording sales on the road.
export const buyersRouter = router({
  list: authedProcedure
    .input(listInput)
    .query(({ ctx, input }) => ctx.services.buyers.findAll(!!input?.archived)),
  get: authedProcedure
    .input(byId)
    .query(({ ctx, input }) => ctx.services.buyers.findOne(input.id)),
  create: authedProcedure
    .input(createBuyerSchema)
    .mutation(({ ctx, input }) => ctx.services.buyers.create(input)),
  update: adminProcedure
    .input(obj({ id: idParam, ...updateBuyerSchema.shape }))
    .mutation(({ ctx, input: { id, ...dto } }) =>
      ctx.services.buyers.update(id, dto),
    ),
  remove: adminProcedure
    .input(byId)
    .mutation(({ ctx, input }) => ctx.services.buyers.remove(input.id)),
  restore: adminProcedure
    .input(byId)
    .mutation(({ ctx, input }) => ctx.services.buyers.restore(input.id)),
});

// Adding a plantation is owner/admin only, unlike a buyer: it is a business
// relationship, not a walk-up customer a worker meets mid-route.
export const plantationsRouter = router({
  list: authedProcedure
    .input(listInput)
    .query(({ ctx, input }) =>
      ctx.services.plantations.findAll(!!input?.archived),
    ),
  get: authedProcedure
    .input(byId)
    .query(({ ctx, input }) => ctx.services.plantations.findOne(input.id)),
  create: adminProcedure
    .input(createPlantationSchema)
    .mutation(({ ctx, input }) => ctx.services.plantations.create(input)),
  update: adminProcedure
    .input(obj({ id: idParam, ...updatePlantationSchema.shape }))
    .mutation(({ ctx, input: { id, ...dto } }) =>
      ctx.services.plantations.update(id, dto),
    ),
  remove: adminProcedure
    .input(byId)
    .mutation(({ ctx, input }) => ctx.services.plantations.remove(input.id)),
  restore: adminProcedure
    .input(byId)
    .mutation(({ ctx, input }) => ctx.services.plantations.restore(input.id)),
});
