import { Role } from "../generated/prisma/enums";
import { ForbiddenException, NotFoundException } from "../errors";
import { idParam, obj } from "../schemas/common";
import {
  adminCreateUserSchema,
  resetPasswordSchema,
  setActiveSchema,
  updateUserSchema,
} from "../schemas/users";
import type { Services } from "../services";
import { adminProcedure, authedProcedure, router, type CtxUser } from "../trpc";

// Which roles each role may create, list and manage. Owner and admin share
// one UI, but admin accounts are hidden from the owner (decided 2026-09-26).
const CAN_MANAGE: Partial<Record<Role, Role[]>> = {
  [Role.ADMIN]: [Role.ADMIN, Role.OWNER, Role.WORKER],
  [Role.OWNER]: [Role.OWNER, Role.WORKER],
};

async function assertCanManage(services: Services, id: string, me: CtxUser) {
  const target = await services.users.getProfile(id);
  const allowed = CAN_MANAGE[me.role] ?? [];
  // same answer as a missing user, so a hidden account stays hidden
  if (!allowed.includes(target.role))
    throw new NotFoundException("User not found");
}

// no public sign-up: accounts are made by the owner or an admin
export const usersRouter = router({
  create: adminProcedure
    .input(adminCreateUserSchema)
    .mutation(({ ctx, input }) => {
      const allowed = CAN_MANAGE[ctx.user.role] ?? [];
      if (!allowed.includes(input.role))
        throw new ForbiddenException(
          `${ctx.user.role} cannot create ${input.role} accounts`,
        );
      const { role, ...rest } = input;
      return ctx.services.users.create(rest, role);
    }),

  // the signed-in user's own profile
  me: authedProcedure.query(({ ctx }) =>
    ctx.services.users.getProfile(ctx.user.id),
  ),

  // ADMIN sees everyone; OWNER sees owners and workers
  list: adminProcedure.query(({ ctx }) =>
    ctx.services.users.list(CAN_MANAGE[ctx.user.role] ?? []),
  ),

  setActive: adminProcedure
    .input(obj({ id: idParam, ...setActiveSchema.shape }))
    .mutation(async ({ ctx, input }) => {
      // stops the last admin from locking everyone out
      if (input.id === ctx.user.id)
        throw new ForbiddenException(
          "You cannot change your own active status",
        );
      await assertCanManage(ctx.services, input.id, ctx.user);
      return ctx.services.users.setActive(input.id, input.isActive);
    }),

  update: adminProcedure
    .input(obj({ id: idParam, ...updateUserSchema.shape }))
    .mutation(async ({ ctx, input: { id, ...dto } }) => {
      await assertCanManage(ctx.services, id, ctx.user);
      return ctx.services.users.update(id, dto);
    }),

  resetPassword: adminProcedure
    .input(obj({ id: idParam, ...resetPasswordSchema.shape }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.user.id)
        throw new ForbiddenException("You cannot reset your own password here");
      await assertCanManage(ctx.services, input.id, ctx.user);
      return ctx.services.users.resetPassword(input.id, input.password);
    }),
});
