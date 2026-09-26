"use client";

import { CircleCheck, Clock, RefreshCw, TriangleAlert } from "lucide-react";
import { useOffline } from "@/components/offline/offline-provider";
import { TONE } from "@/components/offline/sync-bar";
import { useOnline, useSyncData } from "@/components/offline/use-sync-data";
import type { OutboxKind } from "@/lib/offline/db";
import { summarize } from "@/lib/offline/status";
import { titleBar } from "@/lib/ui/styles";

const KIND: Record<OutboxKind, string> = {
  trip: "Trip started",
  tripEnding: "Trip ended",
  pickup: "Pickup",
  buyerRequest: "New buyer",
  sale: "Sale",
  recount: "Recount",
  expense: "Expense",
};

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// Everything on this phone that hasn't reached the server yet, plus sales the
// server flagged. Nothing can be deleted here — a sale must never vanish.
export default function SyncPage() {
  const { userId, phase, syncNow } = useOffline();
  const online = useOnline();
  const { items, conflicts, pending, errors } = useSyncData(userId);
  const { tone, label } = summarize({
    phase,
    pending,
    errors,
    conflicts: conflicts.length,
    online,
  });
  const { box, icon: Icon } = TONE[tone];
  const syncing = phase === "syncing";
  const empty = items.length === 0 && conflicts.length === 0;

  return (
    <div className="space-y-5 pb-4">
      <div className="space-y-1">
        <h1 className={`text-xl font-semibold tracking-tight ${titleBar}`}>
          Sync
        </h1>
        <p className="text-sm text-muted-foreground">
          What you record is saved on this phone first and sent when there’s
          signal.
        </p>
      </div>

      <div
        className={`flex items-center gap-3 rounded-xl p-4 text-base font-semibold ${box}`}
      >
        <Icon aria-hidden className="size-6 shrink-0" />
        <span>{label}</span>
      </div>

      {empty ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-surface p-8 text-center shadow-card">
          <CircleCheck aria-hidden className="size-10 text-success" />
          <p className="text-base font-medium">Everything is synced</p>
          <p className="text-sm text-muted-foreground">
            Nothing is waiting on this phone.
          </p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Items not yet synced">
          {conflicts.map((s) => (
            <li
              key={`c-${s.clientId}`}
              className="space-y-1 rounded-xl bg-surface p-4 shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-medium">
                  Sale · ₱{s.amount}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                  <TriangleAlert aria-hidden className="size-3.5" /> Check with
                  owner
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {time(s.createdAtClient)}
              </p>
              {s.error && <p className="text-sm text-danger">{s.error}</p>}
            </li>
          ))}
          {items.map((item) => (
            <li
              key={item.id}
              className="space-y-1 rounded-xl bg-surface p-4 shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-medium">{KIND[item.kind]}</span>
                {item.status === "error" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                    <TriangleAlert aria-hidden className="size-3.5" /> Not sent
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
                    <Clock aria-hidden className="size-3.5" /> Waiting
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {time(item.createdAt)}
              </p>
              {item.error && (
                <p className="text-sm text-danger">{item.error}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => void syncNow()}
        disabled={syncing || !online}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-base font-medium text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
      >
        <RefreshCw
          aria-hidden
          className={`size-5 ${syncing ? "motion-safe:animate-spin" : ""}`}
        />
        {syncing
          ? "Syncing…"
          : online
            ? "Sync now"
            : "No signal — will sync later"}
      </button>
    </div>
  );
}
