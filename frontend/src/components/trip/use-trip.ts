"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  getDb,
  type LocalBuyerRequest,
  type LocalExpense,
  type LocalPickup,
  type LocalRecount,
  type LocalSale,
  type LocalTrip,
} from "@/lib/offline/db";
import { salesOfDay } from "@/lib/receipt/receipt";
import { fromCenti, toCenti } from "@/lib/trip/money";
import { stockOnTruck, type Stock } from "@/lib/trip/stock";

export type TripData = {
  trip: LocalTrip | null; // the open trip, if any
  pickups: LocalPickup[];
  sales: LocalSale[];
  recounts: LocalRecount[];
  expenses: LocalExpense[];
  stock: Stock;
  /** every buyer the phone knows (archived too), for names on past sales */
  buyers: Map<string, string>;
  /** buyers a new sale can pick */
  activeBuyers: Map<string, string>;
  /** this worker's new-buyer requests */
  requests: Map<string, LocalBuyerRequest>;
  /** waiting ones a new sale can reuse, by name */
  waitingRequests: LocalBuyerRequest[];
  plantations: Map<string, string>;
  today: { cash: string; qr: string; total: string; sales: number };
  todaySales: LocalSale[]; // today, newest first (receipts list)
  recentTrips: LocalTrip[];
};

const sumAmount = (rows: { amount: string }[]) =>
  fromCenti(rows.reduce((n, r) => n + toCenti(r.amount), 0));

// Everything the worker screens need, live from the phone's database
// (so it updates the moment a record is saved, and works offline).
export function useTrip(userId: string): TripData | undefined {
  return useLiveQuery(async () => {
    const db = getDb();
    const trips = await db.trips.where("userId").equals(userId).toArray();
    trips.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const trip = trips.find((t) => !t.endedAt) ?? null;

    const forTrip = <T extends { tripId?: string | null }>(rows: T[]) =>
      trip ? rows.filter((r) => r.tripId === trip.clientId) : [];
    const byTime = <T extends { createdAtClient: string }>(rows: T[]) =>
      rows.sort((a, b) => a.createdAtClient.localeCompare(b.createdAtClient));

    const [pickups, sales, recounts, expenses, buyers, plantations, requests] =
      await Promise.all([
        db.pickups.where("userId").equals(userId).toArray(),
        db.sales.where("userId").equals(userId).toArray(),
        db.recounts.where("userId").equals(userId).toArray(),
        db.expenses.where("userId").equals(userId).toArray(),
        db.buyers.toArray(),
        db.plantations.toArray(),
        db.buyerRequests.where("userId").equals(userId).toArray(),
      ]);

    const tripPickups = byTime(forTrip(pickups));
    const tripSales = byTime(forTrip(sales));
    const todaySales = salesOfDay(sales, new Date());

    return {
      trip,
      pickups: tripPickups,
      sales: tripSales,
      recounts: byTime(forTrip(recounts)),
      expenses: byTime(forTrip(expenses)),
      stock: stockOnTruck(tripPickups, tripSales),
      buyers: new Map(buyers.map((b) => [b.id, b.name])),
      activeBuyers: new Map(
        buyers.filter((b) => !b.archivedAt).map((b) => [b.id, b.name]),
      ),
      requests: new Map(requests.map((r) => [r.clientId, r])),
      waitingRequests: requests
        .filter((r) => r.status === "PENDING")
        .sort((a, b) => a.name.localeCompare(b.name)),
      plantations: new Map(plantations.map((p) => [p.id, p.name])),
      today: {
        cash: sumAmount(todaySales.filter((s) => s.paymentMethod === "CASH")),
        qr: sumAmount(todaySales.filter((s) => s.paymentMethod === "QR")),
        total: sumAmount(todaySales),
        sales: todaySales.length,
      },
      todaySales,
      recentTrips: trips.filter((t) => t.endedAt).slice(0, 5),
    };
  }, [userId]);
}
