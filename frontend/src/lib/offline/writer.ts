import type { PaymentMethod } from "@/lib/api/types";
import { type OfflineDb, type OutboxKind, mirrorTable } from "./db";

type SaleInput = {
  tripId: string;
  buyerId?: string;
  chickenCount: number;
  totalKilo: string;
  amount: string;
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

    recordPickup(input: PickupInput) {
      const s = stamp();
      return save(
        "pickup",
        s.clientId,
        { ...s, ...input },
        { ...input, createdAtClient: s.createdAtClient },
      );
    },

    recordSale(input: SaleInput) {
      const s = stamp();
      const paymentMethod = input.paymentMethod ?? "CASH";
      return save(
        "sale",
        s.clientId,
        { ...s, ...input, paymentMethod },
        { ...input, paymentMethod, createdAtClient: s.createdAtClient },
      );
    },

    recordRecount(input: RecountInput) {
      const s = stamp();
      return save(
        "recount",
        s.clientId,
        { ...s, ...input },
        { ...input, createdAtClient: s.createdAtClient },
      );
    },

    recordExpense(input: ExpenseInput) {
      const s = stamp();
      return save(
        "expense",
        s.clientId,
        { ...s, ...input },
        { ...input, createdAtClient: s.createdAtClient },
      );
    },
  };
}

export type Writer = ReturnType<typeof createWriter>;
