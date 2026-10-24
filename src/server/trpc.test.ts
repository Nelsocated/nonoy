import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError } from "@/lib/trpc/errors";
import { NotFoundException } from "./errors";
import { testClient } from "./test-client";
import {
  adminProcedure,
  authedProcedure,
  publicProcedure,
  router,
} from "./trpc";

const worker = { id: "w1", role: "WORKER" as const };
const owner = { id: "o1", role: "OWNER" as const };

const app = router({
  open: publicProcedure.query(() => "ok"),
  mine: authedProcedure.query(({ ctx }) => ctx.user.id),
  admin: adminProcedure.query(() => "secret"),
  missing: publicProcedure.query(() => {
    throw new NotFoundException("Buyer not found");
  }),
  boom: publicProcedure.query(() => {
    throw new Error("db password in here");
  }),
  validate: publicProcedure
    .input(
      z
        .object({
          name: z.string().min(1, "Enter a name"),
          location: z.string().min(1, "Enter a location"),
        })
        .strict(),
    )
    .mutation(() => "saved"),
});

async function failure(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error("expected a failure");
}

describe("procedures", () => {
  it("lets anyone call a public procedure", async () => {
    expect(await testClient(app).open.query()).toBe("ok");
  });

  it("rejects a signed-out caller with 401 Not signed in", async () => {
    const e = await failure(testClient(app).mine.query());
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 401, message: "Not signed in" });
  });

  it("answers 503, not 401, when the session couldn't be checked", async () => {
    const e = await failure(
      testClient(app, { sessionUnavailable: true }).mine.query(),
    );
    expect(e).toMatchObject({
      status: 503,
      message: "Can't reach the server right now.",
    });
  });

  it("forbids a worker from admin procedures", async () => {
    const e = await failure(testClient(app, { user: worker }).admin.query());
    expect(e).toMatchObject({ status: 403 });
  });

  it("lets the owner use admin procedures", async () => {
    expect(await testClient(app, { user: owner }).admin.query()).toBe("secret");
  });

  it("offline user mismatch: refuses a queue that belongs to someone else", async () => {
    const e = await failure(
      testClient(app, {
        user: worker,
        offlineUser: "someone-else",
      }).mine.query(),
    );
    expect(e).toMatchObject({
      status: 401,
      message: "Signed in as a different user",
    });
  });

  it("allows the queue of the signed-in user", async () => {
    expect(
      await testClient(app, { user: worker, offlineUser: "w1" }).mine.query(),
    ).toBe("w1");
  });
});

describe("errors", () => {
  it("passes a service error through with its status and message", async () => {
    const e = await failure(testClient(app).missing.query());
    expect(e).toMatchObject({ status: 404, message: "Buyer not found" });
  });

  it("hides unexpected errors behind a generic 500", async () => {
    const e = await failure(testClient(app).boom.query());
    expect(e).toMatchObject({ status: 500, message: "Something went wrong" });
  });

  it("joins validation messages like the old API did", async () => {
    const e = await failure(
      testClient(app).validate.mutate({ name: "", location: "" }),
    );
    expect(e).toMatchObject({
      status: 400,
      message: "Enter a name, Enter a location",
    });
  });

  it("rejects unknown fields (old forbidNonWhitelisted)", async () => {
    const e = await failure(
      testClient(app).validate.mutate({
        name: "a",
        location: "b",
        extra: 1,
      } as never),
    );
    expect(e).toMatchObject({ status: 400 });
  });
});
