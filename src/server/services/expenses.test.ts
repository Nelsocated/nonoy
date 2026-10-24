import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenException } from "../errors";
import { ExpensesService } from "./expenses";
import { ActivityLogsService } from "./activity-logs";
import { TripAccessService } from "./trip-access";

describe("ExpensesService", () => {
  let service: ExpensesService;
  const tx = { expense: { findUnique: vi.fn(), create: vi.fn() } };
  const prisma = {
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const logs = { record: vi.fn() };
  const access = { assertOwnership: vi.fn() };

  const dto = {
    clientId: "c1",
    activityLogClientId: "l1",
    description: "Gas",
    amount: "500.00",
    createdAtClient: "2026-01-01T10:00:00Z",
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    tx.expense.findUnique.mockResolvedValue(null);
    tx.expense.create.mockImplementation(async ({ data }) => ({
      id: "e1",
      ...data,
    }));

    service = new ExpensesService(
      prisma as never,
      logs as never,
      access as never,
    );
  });

  it("records an expense without a trip, skipping the trip check", async () => {
    const e = await service.create(dto, "w1");
    expect(e).toMatchObject({
      workerId: "w1",
      tripId: undefined,
      amount: "500.00",
    });
    expect(access.assertOwnership).not.toHaveBeenCalled();
    expect(logs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "EXPENSE_RECORDED",
        workerId: "w1",
      }),
      tx,
    );
  });

  it("checks ownership when linked to a trip", async () => {
    access.assertOwnership.mockRejectedValueOnce(new ForbiddenException());
    await expect(
      service.create({ ...dto, tripId: "t1" }, "w2"),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("is idempotent for the same worker, forbidden for another worker's clientId", async () => {
    tx.expense.findUnique.mockResolvedValue({ id: "old", workerId: "w1" });
    await expect(service.create(dto, "w1")).resolves.toEqual({
      id: "old",
      workerId: "w1",
    });
    await expect(service.create(dto, "w2")).rejects.toThrow(ForbiddenException);
    expect(tx.expense.create).not.toHaveBeenCalled();
  });
});
