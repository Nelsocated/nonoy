import Dexie, { type EntityTable } from "dexie";
import type { Buyer, PaymentMethod, Plantation } from "@/lib/api/types";

// Everything a worker records lives here first; the sync engine sends the outbox.
export type OutboxKind =
  "trip" | "tripEnding" | "pickup" | "sale" | "recount" | "expense";
export type MirrorState = "pending" | "synced" | "error" | "conflict";

export type OutboxItem = {
  id?: number;
  userId: string;
  kind: OutboxKind;
  clientId: string; // tripEnding uses the trip's id (that's what /sync reports back)
  payload: Record<string, unknown>; // exactly the /sync item
  status: "pending" | "error";
  error?: string;
  attempts: number;
  createdAt: string;
};

type Mirror = {
  clientId: string;
  userId: string;
  state: MirrorState;
  error?: string;
  createdAtClient: string;
};
export type LocalTrip = Mirror & { startedAt: string; endedAt: string | null };
export type LocalPickup = Mirror & {
  tripId: string;
  plantationId: string;
  chickenCount: number;
  totalKilo: string;
};
export type LocalSale = Mirror & {
  tripId: string;
  buyerId?: string | null;
  chickenCount: number;
  totalKilo: string;
  amount: string;
  paymentMethod: PaymentMethod;
};
export type LocalRecount = Mirror & {
  tripId: string;
  countedChicken: number;
  countedKilo: string;
};
export type LocalExpense = Mirror & {
  tripId?: string | null;
  description: string;
  amount: string;
};

export class OfflineDb extends Dexie {
  outbox!: EntityTable<OutboxItem, "id">;
  trips!: EntityTable<LocalTrip, "clientId">;
  pickups!: EntityTable<LocalPickup, "clientId">;
  sales!: EntityTable<LocalSale, "clientId">;
  recounts!: EntityTable<LocalRecount, "clientId">;
  expenses!: EntityTable<LocalExpense, "clientId">;
  buyers!: EntityTable<Buyer, "id">;
  plantations!: EntityTable<Plantation, "id">;
  meta!: EntityTable<{ key: string; value: unknown }, "key">;

  constructor(name = "mangfrito") {
    super(name);
    this.version(1).stores({
      outbox: "++id, userId, [userId+kind+clientId]",
      trips: "clientId, userId, startedAt",
      pickups: "clientId, userId, tripId",
      sales: "clientId, userId, tripId, state",
      recounts: "clientId, userId, tripId",
      expenses: "clientId, userId, tripId",
      buyers: "id",
      plantations: "id",
      meta: "key",
    });
  }
}

let db: OfflineDb | null = null;
export const getDb = () => (db ??= new OfflineDb());

// which mirror table an outbox kind updates
export function mirrorTable(d: OfflineDb, kind: OutboxKind) {
  switch (kind) {
    case "trip":
    case "tripEnding":
      return d.trips;
    case "pickup":
      return d.pickups;
    case "sale":
      return d.sales;
    case "recount":
      return d.recounts;
    case "expense":
      return d.expenses;
  }
}
