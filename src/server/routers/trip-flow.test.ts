import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../generated/prisma/enums";
import { testClient } from "../test-client";
import { appRouter } from "./_app";

const ME = "00000000-0000-4000-8000-000000000001";
const ID = "00000000-0000-4000-8000-0000000000aa";
const TRIP = "00000000-0000-4000-8000-0000000000bb";

const fn = () => vi.fn(async (...args: unknown[]) => ({ args }));
const services = {
  trips: { create: fn(), endTrip: fn(), findMine: fn(), findAll: fn() },
  pickups: { create: fn(), getAll: fn() },
  sales: { create: fn(), getAll: fn(), findConflicted: fn(), receipt: fn() },
  recounts: { create: fn(), getAll: fn() },
  expenses: { create: fn(), findMine: fn(), getAll: fn() },
  sync: { processBatch: fn() },
  reports: {
    daily: fn(),
    byWorker: fn(),
    discrepancies: fn(),
    tripsList: fn(),
    tripDetail: fn(),
  },
  dashboard: { openTrips: fn(), problems: fn(), checkProblem: fn() },
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

const sale = {
  clientId: "11111111-1111-4111-8111-111111111111",
  activityLogClientId: "22222222-2222-4222-8222-222222222222",
  tripId: TRIP,
  chickenCount: 1,
  totalKilo: "2.00",
  amount: "360.00",
  createdAtClient: "2026-09-25T01:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

describe("worker records", () => {
  it("are saved under the signed-in worker", async () => {
    const w = as(Role.WORKER);
    const trip = {
      clientId: TRIP,
      startedAt: "2026-09-25T00:00:00Z",
      createdAtClient: "2026-09-25T00:00:00Z",
    };
    await w.trips.start.mutate(trip);
    expect(services.trips.create).toHaveBeenCalledWith(trip, ME);
    await w.trips.end.mutate({ id: TRIP, endedAt: "2026-09-25T09:00:00Z" });
    expect(services.trips.endTrip).toHaveBeenCalledWith(
      TRIP,
      { endedAt: "2026-09-25T09:00:00Z" },
      ME,
    );
    await w.sales.create.mutate(sale);
    expect(services.sales.create).toHaveBeenCalledWith(sale, ME);
    await w.trips.mine.query();
    expect(services.trips.findMine).toHaveBeenCalledWith(ME);
    await w.expenses.mine.query();
    expect(services.expenses.findMine).toHaveBeenCalledWith(ME);
  });

  it("everyone else's lists are staff only", async () => {
    const w = as(Role.WORKER);
    for (const p of [
      w.trips.list.query(),
      w.pickups.list.query(),
      w.sales.list.query(),
      w.recounts.list.query(),
      w.expenses.list.query(),
      w.sales.receipt.query({ clientId: ID }),
      w.reports.daily.query(),
      w.reports.workers.query(),
      w.reports.discrepancies.query(),
      w.reports.openTrips.query(),
      w.reports.problems.query(),
      w.reports.trips.query({ month: "2026-09" }),
      w.reports.check.mutate({ kind: "sale", id: ID }),
    ])
      expect(await failure(p)).toMatchObject({ status: 403 });
  });
});

describe("sales", () => {
  it("lists conflicted ones when asked", async () => {
    await as(Role.OWNER).sales.list.query({ conflicted: true });
    expect(services.sales.findConflicted).toHaveBeenCalled();
    await as(Role.OWNER).sales.list.query();
    expect(services.sales.getAll).toHaveBeenCalled();
  });

  it("receipt rejects an id that is not a UUID", async () => {
    expect(
      await failure(as(Role.OWNER).sales.receipt.query({ clientId: "abc" })),
    ).toMatchObject({ status: 400 });
    expect(services.sales.receipt).not.toHaveBeenCalled();
    await as(Role.OWNER).sales.receipt.query({ clientId: ID });
    expect(services.sales.receipt).toHaveBeenCalledWith(ID);
  });
});

describe("reports", () => {
  it("only checks recounts and sales", async () => {
    expect(
      await failure(
        as(Role.OWNER).reports.check.mutate({ kind: "foo" as never, id: ID }),
      ),
    ).toMatchObject({ status: 400, message: "kind must be recount or sale" });
    await as(Role.OWNER).reports.check.mutate({
      kind: "sale",
      id: ID,
      note: " ok ",
    });
    expect(services.dashboard.checkProblem).toHaveBeenCalledWith(
      "sale",
      ID,
      "ok",
      ME,
    );
  });

  it("problems default to page 1", async () => {
    await as(Role.OWNER).reports.problems.query();
    expect(services.dashboard.problems).toHaveBeenLastCalledWith(1);
    await as(Role.OWNER).reports.problems.query({ page: 3 });
    expect(services.dashboard.problems).toHaveBeenLastCalledWith(3);
  });

  it("a worker may open a trip's detail (ownership checked in the service)", async () => {
    await as(Role.WORKER).reports.trip.query({ id: TRIP });
    expect(services.reports.tripDetail).toHaveBeenCalledWith(TRIP, {
      id: ME,
      role: Role.WORKER,
    });
  });

  it("passes the date range through", async () => {
    await as(Role.OWNER).reports.daily.query({
      from: "2026-09-01",
      to: "2026-09-07",
    });
    expect(services.reports.daily).toHaveBeenCalledWith({
      from: "2026-09-01",
      to: "2026-09-07",
    });
    expect(
      await failure(as(Role.OWNER).reports.daily.query({ from: "Sept 1" })),
    ).toMatchObject({ status: 400, message: "from must be YYYY-MM-DD" });
  });
});

describe("sync", () => {
  it("pushes a batch under the signed-in worker and returns per-item results", async () => {
    const results = {
      sales: [{ clientId: sale.clientId, status: "ok", serverId: "s1" }],
    };
    services.sync.processBatch.mockResolvedValueOnce(results as never);
    expect(await as(Role.WORKER).sync.push.mutate({ sales: [sale] })).toEqual(
      results,
    );
    expect(services.sync.processBatch).toHaveBeenCalledWith(
      { sales: [sale] },
      ME,
    );
  });

  it("bad item is BAD_REQUEST not 500 (the phone splits the batch to find it)", async () => {
    const { clientId: _, ...noId } = sale;
    expect(
      await failure(
        as(Role.WORKER).sync.push.mutate({ sales: [noId as never] }),
      ),
    ).toMatchObject({ status: 400 });
    expect(services.sync.processBatch).not.toHaveBeenCalled();
  });
});
