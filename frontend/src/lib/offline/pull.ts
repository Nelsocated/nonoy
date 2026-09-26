import type { Api } from "@/lib/api";
import type { OfflineDb } from "./db";

const RECENT_TRIPS = 5;

// Refresh the phone's copy from the server. Anything still waiting in the outbox
// wins over the server copy, so an unsynced local change is never overwritten.
export async function pullInto(
  db: OfflineDb,
  userId: string,
  api: Pick<
    Api,
    | "buyers"
    | "plantations"
    | "trips"
    | "expenses"
    | "reports"
    | "prices"
    | "paymentQrs"
  >,
) {
  const [buyers, plantations, trips, expenses, price, qrs] = await Promise.all([
    // archived too: old sales keep their buyer names; the sale form hides them
    api.buyers.list({ archived: true }),
    api.plantations.list(),
    api.trips.mine(),
    api.expenses.mine(),
    // optional extra: a failed price fetch keeps the saved price, not the old data
    api.prices.current().catch(() => null),
    // optional extra like the price: a failed fetch keeps the saved codes
    api.paymentQrs.list().catch(() => null),
  ]);
  const details = await Promise.all(
    trips.slice(0, RECENT_TRIPS).map((t) => api.reports.trip(t.id)),
  );

  const pending = new Set(
    (await db.outbox.where("userId").equals(userId).toArray()).map(
      (o) => o.clientId,
    ),
  );
  const keep = <T extends { clientId: string }>(rows: T[]) =>
    rows.filter((r) => !pending.has(r.clientId));
  const synced = { userId, state: "synced" as const, error: undefined };

  await db.transaction(
    "rw",
    [
      db.buyers,
      db.plantations,
      db.paymentQrs,
      db.trips,
      db.pickups,
      db.sales,
      db.recounts,
      db.expenses,
      db.meta,
    ],
    async () => {
      await db.buyers.clear();
      await db.buyers.bulkPut(buyers);
      await db.plantations.clear();
      await db.plantations.bulkPut(plantations);
      if (qrs) {
        await db.paymentQrs.clear();
        await db.paymentQrs.bulkPut(
          qrs.map((q, position) => ({ ...q, position })),
        );
      }

      await db.trips.bulkPut(
        keep(trips).map((t) => ({
          clientId: t.clientId,
          startedAt: t.startedAt,
          endedAt: t.endedAt,
          createdAtClient: t.createdAtClient,
          ...synced,
        })),
      );
      await db.expenses.bulkPut(
        keep(expenses).map((e) => ({
          clientId: e.clientId,
          tripId: e.tripId,
          description: e.description,
          amount: e.amount,
          createdAtClient: e.createdAtClient,
          ...synced,
        })),
      );
      for (const d of details) {
        await db.pickups.bulkPut(
          keep(d.pickups).map((p) => ({
            clientId: p.clientId,
            tripId: p.tripId,
            plantationId: p.plantationId,
            chickenCount: p.chickenCount,
            totalKilo: p.totalKilo,
            createdAtClient: p.createdAtClient,
            ...synced,
          })),
        );
        await db.recounts.bulkPut(
          keep(d.recounts).map((r) => ({
            clientId: r.clientId,
            tripId: r.tripId,
            countedChicken: r.countedChicken,
            countedKilo: r.countedKilo,
            createdAtClient: r.createdAtClient,
            ...synced,
          })),
        );
        await db.sales.bulkPut(
          keep(d.sales).map((s) => ({
            clientId: s.clientId,
            tripId: s.tripId,
            buyerId: s.buyerId,
            chickenCount: s.chickenCount,
            totalKilo: s.totalKilo,
            amount: s.amount,
            pricePerKilo: s.pricePerKilo,
            listPricePerKilo: s.listPricePerKilo,
            paymentMethod: s.paymentMethod,
            createdAtClient: s.createdAtClient,
            userId,
            state:
              s.syncStatus === "CONFLICT"
                ? ("conflict" as const)
                : ("synced" as const),
            error: s.conflictReason ?? undefined,
          })),
        );
      }
      // owner's price for offline sales; keep the last one if none is set
      if (price) {
        await db.meta.put({
          key: "price",
          value: {
            pricePerKilo: price.pricePerKilo,
            setAt: price.createdAt,
            fetchedAt: new Date().toISOString(),
          },
        });
      }
      await db.meta.put({
        key: `lastPullAt:${userId}`,
        value: new Date().toISOString(),
      });
    },
  );
}
