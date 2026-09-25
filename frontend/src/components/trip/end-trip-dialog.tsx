"use client";

import { ClipboardCheck, Flag } from "lucide-react";
import Link from "next/link";
import { forwardRef } from "react";
import { fromCenti, peso, toCenti } from "@/lib/trip/money";
import { useOffline } from "@/components/offline/offline-provider";
import type { TripData } from "./use-trip";

const button =
  "flex min-h-12 items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100";

const total = (rows: { amount: string }[]) =>
  fromCenti(rows.reduce((n, r) => n + toCenti(r.amount), 0));

// Totals before closing the trip; suggests a recount (not required).
export const EndTripDialog = forwardRef<
  HTMLDialogElement,
  { data: TripData; onConfirm: () => void }
>(function EndTripDialog({ data, onConfirm }, ref) {
  const { seesStock } = useOffline();
  const close = () =>
    (ref as React.RefObject<HTMLDialogElement | null>).current?.close();
  const sold = data.sales.reduce(
    (a, s) => ({
      chicken: a.chicken + s.chickenCount,
      centi: a.centi + toCenti(s.totalKilo),
    }),
    { chicken: 0, centi: 0 },
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby="end-trip-title"
      className="m-auto w-[min(22rem,calc(100%-2rem))] rounded-xl bg-surface p-6 text-foreground shadow-card backdrop:bg-ink-950/50"
    >
      <Flag aria-hidden className="size-8 text-primary" />
      <h2 id="end-trip-title" className="mt-3 text-lg font-semibold">
        End this trip?
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Sold</dt>
        <dd className="text-right tabular-nums">
          {sold.chicken} chickens · {fromCenti(sold.centi)} kg
        </dd>
        <dt className="text-muted-foreground">Sales</dt>
        <dd className="text-right tabular-nums">{peso(total(data.sales))}</dd>
        <dt className="text-muted-foreground">Expenses</dt>
        <dd className="text-right tabular-nums">
          {peso(total(data.expenses))}
        </dd>
        {/* workers never see the stock (blind recount); owner/admin may */}
        {seesStock && (
          <>
            <dt className="text-muted-foreground">Left on truck</dt>
            <dd className="text-right tabular-nums">
              {data.stock.chicken} · {data.stock.kilo} kg
            </dd>
          </>
        )}
      </dl>
      {data.recounts.length === 0 && (
        <p className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
          You haven&apos;t done a recount on this trip. It&apos;s best to count
          what&apos;s left before ending.
        </p>
      )}
      <div className="mt-6 flex flex-col gap-2">
        {data.recounts.length === 0 && (
          <Link
            href="/field/recount"
            onClick={close}
            className={`${button} bg-primary text-primary-foreground hover:bg-primary-hover`}
          >
            <ClipboardCheck aria-hidden className="size-5" /> Recount first
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            close();
            onConfirm();
          }}
          className={`${button} ${
            data.recounts.length === 0
              ? "border border-input text-foreground hover:bg-muted"
              : "bg-primary text-primary-foreground hover:bg-primary-hover"
          }`}
        >
          End trip
        </button>
        <button
          type="button"
          autoFocus
          onClick={close}
          className={`${button} text-muted-foreground hover:bg-muted`}
        >
          Cancel
        </button>
      </div>
    </dialog>
  );
});
