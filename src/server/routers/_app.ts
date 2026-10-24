import { router } from "../trpc";

// One sub-router per old Nest controller, same names as the old api.* calls.
export const appRouter = router({});

export type AppRouter = typeof appRouter;
