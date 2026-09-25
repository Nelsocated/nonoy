import type { PaymentMethod } from "@/lib/api/types";
import { type OfflineDb, type OutboxKind, mirrorTable } from "./db";
import * as check from "./validate";
import { saleAmount } from "@/lib/trip/money";

type SaleInput = {
  tripId: string;
  buyerId?: string;
  chickenCount: number;
  totalKilo: string;
  /** price charged; the amount is computed from it (kilos × price) */
  pricePerKilo: string;
  /** the owner's price the phone had — differs when the worker edited it */
  listPricePerKilo?: string;
  paymentMethod?: PaymentMethod;
};
type PickupInput = {
  tripId: string;
  plantationId: string;
  chickenCount: number;
  totalKilo: string;
};
type RecountInput = {
  tripId: string;
  countedChicken: number;
  countedKilo: string;
};
type ExpenseInput = { tripId?: string; description: string; amount: string };

// Screens call these; each saves the record and its outbox item in one transaction,
// so a record is never shown without being queued (or queued without being shown).
export function createWriter(
  db: OfflineDb,
  userId: string,
  onWrite: () => void = () => {},
) {
  const now = () => new Date().toISOString();
  const uuid = () => crypto.randomUUID();

  async function save(
    kind: OutboxKind,
    clientId: string,
    payload: Record<string, unknown>,
    mirror: object,
  ) {
    const table = mirrorTable(db, kind);
    await db.transaction("rw", db.outbox, table, async () => {
      await table.put({
        ...mirror,
        clientId,
        userId,
        state: "pending",
      } as never);
      await db.outbox.add({
        userId,
        kind,
        clientId,
        payload,
        status: "pending",
        attempts: 0,
        createdAt: now(),
      });
    });
    onWrite();
    return clientId;
  }

  // fields every non-trip record sends to /sync
  const stamp = () => ({
    clientId: uuid(),
    activityLogClientId: uuid(),
    createdAtClient: now(),
  });

  return {
    startTrip() {
      const clientId = uuid();
      const t = now();
      const payload = { clientId, startedAt: t, createdAtClient: t };
      return save("trip", clientId, payload, {
        startedAt: t,
        endedAt: null,
        createdAtClient: t,
      });
    },

    async endTrip(tripId: string) {
      const endedAt = now();
      await db.transaction("rw", db.outbox, db.trips, async () => {
        await db.trips.update(tripId, { endedAt, state: "pending" });
        await db.outbox.add({
          userId,
          kind: "tripEnding",
          clientId: tripId,
          payload: { tripId, endedAt },
          status: "pending",
          attempts: 0,
          createdAt: now(),
        });
      });
      onWrite();
      return tripId;
    },

    async recordPickup(input: PickupInput) {
      check.uuid(input.tripId, "trip");
      check.uuid(input.plantationId, "plantation");
      check.chickens(input.chickenCount);
      check.amount(input.totalKilo, "Total kilo");
      const s = stamp();
      return save(
        "pickup",
        s.clientId,
        { ...s, ...input },
        { ...input, createdAtClient: s.createdAtClient },
      );
    },

    async recordSale({ buyerId, ...rest }: SaleInput) {
      check.uuid(rest.tripId, "trip");
      if (buyerId) check.uuid(buyerId, "buyer");
      check.chickens(rest.chickenCount);
      check.amount(rest.totalKilo, "Total kilo");
      check.amount(rest.pricePerKilo, "Price per kilo");
      if (rest.listPricePerKilo)
        check.amount(rest.listPricePerKilo, "Owner price");
      // an empty buyer field means a walk-in customer, not an invalid id
      const base = buyerId ? { ...rest, buyerId } : rest;
      // computed here exactly like the backend checks it (half-up to the centavo)
      const input = {
        ...base,
        amount: saleAmount(base.totalKilo, base.pricePerKilo),
      };
      const paymentMethod = input.paymentMethod ?? "CASH";
      const s = stamp();
      return save(
        "sale",
        s.clientId,
        { ...s, ...input, paymentMethod },
        { ...input, paymentMethod, createdAtClient: s.createdAtClient },
      );
    },

    async recordRecount(input: RecountInput) {
      check.uuid(input.tripId, "trip");
      check.chickens(input.countedChicken, { allowZero: true });
      check.amount(input.countedKilo, "Counted kilo");
      const s = stamp();
      return save(
        "recount",
        s.clientId,
        { ...s, ...input },
        { ...input, createdAtClient: s.createdAtClient },
      );
    },

    async recordExpense(input: ExpenseInput) {
      if (input.tripId) check.uuid(input.tripId, "trip");
      check.description(input.description);
      check.amount(input.amount, "Amount");
      const s = stamp();
      const clean = { ...input, description: input.description.trim() };
      return save(
        "expense",
        s.clientId,
        { ...s, ...clean },
        { ...clean, createdAtClient: s.createdAtClient },
      );
    },
  };
}

export type Writer = ReturnType<typeof createWriter>;
