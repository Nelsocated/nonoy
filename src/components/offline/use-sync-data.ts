"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useSyncExternalStore } from "react";
import { getDb, type OutboxItem, type LocalSale } from "@/lib/offline/db";

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

export type SyncData = {
  items: OutboxItem[];
  conflicts: LocalSale[];
  pending: number;
  errors: number;
};

const EMPTY: SyncData = { items: [], conflicts: [], pending: 0, errors: 0 };

// Live view of this user's queue and backend-flagged sales; re-renders on every change.
export function useSyncData(userId: string): SyncData {
  return (
    useLiveQuery(async () => {
      const db = getDb();
      const [items, conflicts] = await Promise.all([
        db.outbox.where("userId").equals(userId).sortBy("id"),
        db.sales
          .where("state")
          .equals("conflict")
          .filter((s) => s.userId === userId)
          .toArray(),
      ]);
      const errors = items.filter((i) => i.status === "error").length;
      return { items, conflicts, pending: items.length - errors, errors };
    }, [userId]) ?? EMPTY
  );
}
