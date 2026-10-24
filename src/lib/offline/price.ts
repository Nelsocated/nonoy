import type { OfflineDb } from "./db";

export type PhonePrice = {
  pricePerKilo: string;
  /** when the owner set it */
  setAt: string;
  /** when this phone last downloaded it */
  fetchedAt: string;
};

// The owner's price per kilo as last synced to this phone (null = never synced
// or never set — the sale form then asks the worker to type a price).
export async function getPrice(db: OfflineDb): Promise<PhonePrice | null> {
  return (
    ((await db.meta.get("price"))?.value as PhonePrice | undefined) ?? null
  );
}
