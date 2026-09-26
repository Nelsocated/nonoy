"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { createApi } from "@/lib/api";
import { OFFLINE_USER_HEADER } from "@/lib/api/forward";
import { createHttp } from "@/lib/api/http";
import { getDb } from "@/lib/offline/db";
import { warmFieldPages } from "@/lib/offline/sw-caches";
import { createSyncEngine } from "@/lib/offline/engine";
import { pullInto } from "@/lib/offline/pull";
import { createRuntime, type SyncPhase } from "@/lib/offline/runtime";
import { createWriter, type Writer } from "@/lib/offline/writer";

type Offline = {
  userId: string;
  /** shown on receipts */
  userName: string;
  /** owner/admin on a trip may see the truck stock; workers never (blind recount) */
  seesStock: boolean;
  writer: Writer;
  phase: SyncPhase;
  syncNow(): Promise<void>;
};
const Ctx = createContext<Offline | null>(null);

export function OfflineProvider({
  userId,
  userName,
  seesStock = false,
  children,
}: {
  userId: string;
  userName: string;
  seesStock?: boolean;
  children: React.ReactNode;
}) {
  const runtime = useMemo(() => {
    // No onUnauthorized redirect: a dead session pauses sync (queue kept)
    // instead of yanking the worker to /login mid-task. The header lets /api
    // refuse this queue if a different user is signed in now.
    const syncApi = createApi(
      createHttp({
        baseUrl: "/api",
        headers: () => ({ [OFFLINE_USER_HEADER]: userId }),
      }),
    );
    const db = getDb();
    const engine = createSyncEngine({
      db,
      userId,
      push: (b) => syncApi.sync.push(b),
      pull: () => pullInto(db, userId, syncApi),
    });
    return createRuntime({ engine });
  }, [userId]);
  const writer = useMemo(
    () => createWriter(getDb(), userId, () => void runtime.requestSync()),
    [userId, runtime],
  );

  useEffect(() => runtime.start(), [runtime]);
  // with signal, keep a copy of every worker screen so all of them open offline
  useEffect(() => {
    if (navigator.onLine) void warmFieldPages();
  }, [userId]);
  const phase = useSyncExternalStore(
    runtime.subscribe,
    runtime.getPhase,
    () => "idle" as const,
  );

  const value = useMemo(
    () => ({
      userId,
      userName,
      seesStock,
      writer,
      phase,
      syncNow: () => runtime.requestSync({ manual: true }),
    }),
    [userId, userName, seesStock, writer, phase, runtime],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOffline() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOffline must be used inside <OfflineProvider>");
  return v;
}
