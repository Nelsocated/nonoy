import { z } from "zod";
import { ActionType } from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";
import { enumOf, isoDate, obj, str, uuid } from "./common";

export const createActivityLogSchema = obj({
  clientId: uuid("clientId"),
  tripId: str("tripId").nullish(),
  actionType: enumOf(
    "actionType",
    Object.values(ActionType) as [ActionType, ...ActionType[]],
  ),
  payload: z.record(z.string(), z.unknown(), {
    error: "payload must be an object",
  }),
  createdAtClient: isoDate("createdAtClient"),
});
export type CreateActivityLogDto = Omit<
  z.infer<typeof createActivityLogSchema>,
  "payload"
> & { payload: Prisma.InputJsonValue };

// What the service records: workerId always comes from the authenticated
// user (or the calling service), never from the request body
export type RecordActivityLogInput = CreateActivityLogDto & {
  workerId: string;
};
