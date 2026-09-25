"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import {
  CircleCheck,
  ClipboardCheck,
  Flag,
  PackagePlus,
  Play,
  Receipt,
  Truck,
  Wallet,
} from "lucide-react";
import { useOffline } from "@/components/offline/offline-provider";
import { EndTripDialog } from "@/components/trip/end-trip-dialog";
import { RecordList } from "@/components/trip/record-list";
import { useTrip } from "@/components/trip/use-trip";
import { peso } from "@/lib/trip/money";

const ACTIONS = [
  { href: "/field/pickup", label: "Pickup", icon: PackagePlus },
  { href: "/field/sale", label: "Sale", icon: Receipt },
  { href: "/field/recount", label: "Recount", icon: ClipboardCheck },
  { href: "/field/expense", label: "Expense", icon: Wallet },
];

const tile =
  "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl bg-surface text-base font-medium shadow-card transition-colors hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100";

const day = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function Saved() {
  const message = useSearchParams().get("saved");
  if (!message) return null;
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success"
    >
      <CircleCheck aria-hidden className="size-5" /> {message}
    </p>
  );
}

export default function FieldHome() {
  const { userId, writer } = useOffline();
  const data = useTrip(userId);
  const router = useRouter();
  const endDialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  async function start() {
    setBusy(true);
    try {
      await writer.startTrip();
      router.replace("/field?saved=Trip started");
    } finally {
      setBusy(false);
    }
  }

  async function end(tripId: string) {
    await writer.endTrip(tripId);
    router.replace("/field?saved=Trip ended");
  }

  const { trip, today } = data;

  return (
    <div className="space-y-5">
      <Suspense>
        <Saved />
      </Suspense>

      {trip ? (
        <>
          <section className="rounded-xl bg-primary p-5 text-primary-foreground shadow-primary">
            {/* no stock numbers here: the recount is blind */}
            <p className="flex items-center gap-2 text-sm opacity-90">
              <Truck aria-hidden className="size-4" /> Trip open
            </p>
            <p className="mt-2 text-2xl font-semibold">
              Since {day(trip.startedAt)}
            </p>
          </section>

          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={tile}>
                <Icon aria-hidden className="size-6 text-primary" />
                {label}
              </Link>
            ))}
          </div>

          <RecordList data={data} />

          <button
            type="button"
            onClick={() => endDialog.current?.showModal()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-input bg-surface text-base font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
          >
            <Flag aria-hidden className="size-5" /> End trip
          </button>
          <EndTripDialog
            ref={endDialog}
            data={data}
            onConfirm={() => void end(trip.clientId)}
          />
        </>
      ) : (
        <section className="space-y-4 rounded-xl bg-surface p-6 text-center shadow-card">
          <Truck aria-hidden className="mx-auto size-10 text-primary" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">No trip right now</h1>
            <p className="text-sm text-muted-foreground">
              Start a trip when you leave for the pickup.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void start()}
            disabled={busy}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-primary text-lg font-medium text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover active:bg-primary-active disabled:opacity-60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
          >
            <Play aria-hidden className="size-5" /> Start trip
          </button>
          <Link
            href="/field/expense"
            className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Wallet aria-hidden className="size-4" /> Record an expense without
            a trip
          </Link>
        </section>
      )}

      <section className="rounded-xl bg-surface p-5 shadow-card">
        <h2 className="text-sm text-muted-foreground">
          Today · {today.sales} {today.sales === 1 ? "sale" : "sales"}
        </h2>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {peso(today.total)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {peso(today.cash)} cash · {peso(today.qr)} QR
        </p>
      </section>

      {!trip && data.recentTrips.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent trips
          </h2>
          <ul className="divide-y rounded-xl bg-surface shadow-card">
            {data.recentTrips.map((t) => (
              <li key={t.clientId} className="px-4 py-3 text-sm">
                {day(t.startedAt)} → {t.endedAt ? day(t.endedAt) : "open"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
