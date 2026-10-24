import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../generated/prisma/enums";
import { testClient } from "../test-client";
import { appRouter } from "./_app";

const ME = "00000000-0000-4000-8000-000000000001";
const ID = "00000000-0000-4000-8000-0000000000aa";
const TRIP = "00000000-0000-4000-8000-0000000000bb";

const fn = () => vi.fn(async (...args: unknown[]) => ({ args }));
const crud = () => ({
  findAll: fn(),
  findOne: fn(),
  create: fn(),
  update: fn(),
  remove: fn(),
  restore: fn(),
});
const services = {
  buyers: crud(),
  plantations: crud(),
  prices: { current: fn(), history: fn(), create: fn() },
  paymentQrs: { list: fn(), create: fn(), update: fn(), remove: fn() },
  activityLogs: { record: fn(), getAll: fn() },
  buyerRequests: {
    pending: fn(),
    mine: fn(),
    approve: fn(),
    merge: fn(),
    reject: fn(),
  },
  tripAccess: { assertOwnership: fn() },
};
const as = (role: Role) =>
  testClient(appRouter, {
    user: { id: ME, role },
    services: services as never,
  });

async function failure(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error("expected a failure");
}

beforeEach(() => vi.clearAllMocks());

describe("buyers & plantations", () => {
  it("lists active by default, archived when asked", async () => {
    await as(Role.WORKER).buyers.list.query();
    expect(services.buyers.findAll).toHaveBeenLastCalledWith(false);
    await as(Role.OWNER).buyers.list.query({ archived: true });
    expect(services.buyers.findAll).toHaveBeenLastCalledWith(true);
    await as(Role.OWNER).plantations.list.query({ archived: true });
    expect(services.plantations.findAll).toHaveBeenLastCalledWith(true);
  });

  it("a worker may add a buyer but not a plantation", async () => {
    await as(Role.WORKER).buyers.create.mutate({ name: "Aling Nena" });
    expect(services.buyers.create).toHaveBeenCalledWith({ name: "Aling Nena" });
    expect(
      await failure(
        as(Role.WORKER).plantations.create.mutate({ name: "Farm" }),
      ),
    ).toMatchObject({ status: 403 });
  });

  it("only owners and admins edit, remove or restore", async () => {
    const w = as(Role.WORKER);
    for (const p of [
      w.buyers.update.mutate({ id: ID, name: "X" }),
      w.buyers.remove.mutate({ id: ID }),
      w.buyers.restore.mutate({ id: ID }),
      w.plantations.update.mutate({ id: ID, name: "X" }),
      w.plantations.remove.mutate({ id: ID }),
      w.plantations.restore.mutate({ id: ID }),
    ])
      expect(await failure(p)).toMatchObject({ status: 403 });
    await as(Role.ADMIN).buyers.update.mutate({ id: ID, name: "Y" });
    expect(services.buyers.update).toHaveBeenCalledWith(ID, { name: "Y" });
  });

  it("shows the custom message for a blank name", async () => {
    expect(
      await failure(as(Role.OWNER).buyers.create.mutate({ name: " " })),
    ).toMatchObject({ status: 400, message: "Enter a name" });
  });
});

describe("prices", () => {
  it("any role reads the current price; history and changes are staff only", async () => {
    await as(Role.WORKER).prices.current.query();
    expect(await failure(as(Role.WORKER).prices.history.query())).toMatchObject(
      { status: 403 },
    );
    expect(
      await failure(
        as(Role.WORKER).prices.set.mutate({ pricePerKilo: "185.50" }),
      ),
    ).toMatchObject({ status: 403 });
  });

  it("set passes the signed-in user as the setter", async () => {
    await as(Role.OWNER).prices.set.mutate({ pricePerKilo: "185.50" });
    expect(services.prices.create).toHaveBeenCalledWith(ME, {
      pricePerKilo: "185.50",
    });
  });

  it("current is null when no price was ever set", async () => {
    services.prices.current.mockResolvedValueOnce(null as never);
    expect(await as(Role.WORKER).prices.current.query()).toBeNull();
  });
});

describe("payment QRs", () => {
  it("any role lists; only staff change them", async () => {
    await as(Role.WORKER).paymentQrs.list.query();
    expect(
      await failure(
        as(Role.WORKER).paymentQrs.create.mutate({
          label: "GCash",
          payload: "x",
        }),
      ),
    ).toMatchObject({ status: 403 });
    await as(Role.OWNER).paymentQrs.update.mutate({ id: ID, label: "Maya" });
    expect(services.paymentQrs.update).toHaveBeenCalledWith(ID, {
      label: "Maya",
    });
    await as(Role.OWNER).paymentQrs.remove.mutate({ id: ID });
    expect(services.paymentQrs.remove).toHaveBeenCalledWith(ID);
  });
});

describe("activity logs", () => {
  const log = {
    clientId: ID,
    tripId: TRIP,
    actionType: "SALE_RECORDED" as const,
    payload: {},
    createdAtClient: "2026-10-24T08:00:00.000Z",
  };

  it("checks trip ownership, then records under the signed-in worker", async () => {
    await as(Role.WORKER).activityLogs.create.mutate(log);
    expect(services.tripAccess.assertOwnership).toHaveBeenCalledWith(TRIP, ME);
    expect(services.activityLogs.record).toHaveBeenCalledWith({
      ...log,
      workerId: ME,
    });
  });

  it("only staff list them", async () => {
    expect(
      await failure(as(Role.WORKER).activityLogs.list.query()),
    ).toMatchObject({ status: 403 });
  });
});

describe("buyer requests", () => {
  it("staff decide; anyone sees their own", async () => {
    await as(Role.WORKER).buyerRequests.mine.query();
    expect(services.buyerRequests.mine).toHaveBeenCalledWith(ME);
    expect(
      await failure(as(Role.WORKER).buyerRequests.pending.query()),
    ).toMatchObject({ status: 403 });
    await as(Role.OWNER).buyerRequests.approve.mutate({
      id: ID,
      name: "Nena",
      location: null,
    });
    expect(services.buyerRequests.approve).toHaveBeenCalledWith(
      ID,
      { name: "Nena", location: null },
      ME,
    );
    await as(Role.OWNER).buyerRequests.merge.mutate({ id: ID, buyerId: TRIP });
    expect(services.buyerRequests.merge).toHaveBeenCalledWith(ID, TRIP, ME);
    await as(Role.OWNER).buyerRequests.reject.mutate({ id: ID });
    expect(services.buyerRequests.reject).toHaveBeenCalledWith(ID, ME);
  });
});
