"use client";

import {
  CircleCheck,
  ClipboardCheck,
  Clock,
  PackagePlus,
  Receipt,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import type { MirrorState } from "@/lib/offline/db";
import { saleBuyerName } from "@/lib/trip/buyer-name";
import { peso, toCenti } from "@/lib/trip/money";
import type { TripData } from "./use-trip";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });

const MARK: Record<
  MirrorState,
  { icon: typeof Clock; label: string; tone: string }
> = {
  synced: { icon: CircleCheck, label: "Synced", tone: "text-success" },
  pending: { icon: Clock, label: "Waiting to sync", tone: "text-warning" },
  error: { icon: TriangleAlert, label: "Needs attention", tone: "text-danger" },
  conflict: {
    icon: TriangleAlert,
    label: "Check with owner",
    tone: "text-danger",
  },
};

type Row = {
  key: string;
  at: string;
  icon: typeof Clock;
  title: string;
  detail: string;
  state: MirrorState;
};

// Everything recorded on the open trip, oldest first, with a sync marker each.
export function RecordList({ data }: { data: TripData }) {
  const rows: Row[] = [
    ...data.pickups.map((p) => ({
      key: p.clientId,
      at: p.createdAtClient,
      icon: PackagePlus,
      title: "Pickup",
      detail: `${p.chickenCount} chickens · ${p.totalKilo} kg · ${data.plantations.get(p.plantationId) ?? "Plantation"}`,
      state: p.state,
    })),
    ...data.sales.map((s) => ({
      key: s.clientId,
      at: s.createdAtClient,
      icon: Receipt,
      title: `Sale · ${peso(s.amount)}`,
      detail: `${saleBuyerName(s, data)} · ${s.chickenCount} chickens · ${s.totalKilo} kg · ${s.paymentMethod === "QR" ? "QR" : "Cash"}${
        // compare as centavos: the server sends "175", the phone stores "175.00"
        s.pricePerKilo &&
        s.listPricePerKilo &&
        toCenti(s.pricePerKilo) !== toCenti(s.listPricePerKilo)
          ? " · price changed"
          : ""
      }`,
      state: s.state,
    })),
    ...data.recounts.map((r) => ({
      key: r.clientId,
      at: r.createdAtClient,
      icon: ClipboardCheck,
      title: "Recount",
      detail: `${r.countedChicken} chickens · ${r.countedKilo} kg`,
      state: r.state,
    })),
    ...data.expenses.map((e) => ({
      key: e.clientId,
      at: e.createdAtClient,
      icon: Wallet,
      title: `Expense · ${peso(e.amount)}`,
      detail: e.description,
      state: e.state,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  if (!rows.length)
    return (
      <p className="rounded-xl bg-surface p-5 text-sm text-muted-foreground shadow-card">
        Nothing recorded on this trip yet. Start with a pickup.
      </p>
    );

  return (
    <ol
      className="divide-y rounded-xl bg-surface shadow-card"
      aria-label="This trip"
    >
      {rows.map(({ key, at, icon: Icon, title, detail, state }) => {
        const mark = MARK[state];
        const Mark = mark.icon;
        return (
          <li key={key} className="flex items-start gap-3 px-4 py-3">
            <Icon
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{detail}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">{time(at)}</span>
              <Mark aria-label={mark.label} className={`size-4 ${mark.tone}`} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
