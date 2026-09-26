"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { api } from "@/lib/api/browser";
import { pagedList, pageOf } from "@/lib/admin/paging";
import { tripTimeline } from "@/lib/admin/timeline";
import { peso } from "@/lib/trip/money";
import { Pager } from "./pager";
import { TripRecords } from "./trip-records";
import { cardCount, cardTitle, statCard, titleBar } from "@/lib/ui/styles";
import { ContentSkeleton } from "@/components/skeleton";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className={statCard}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {sub && (
        <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>
      )}
    </div>
  );
}

// Owner/admin view of one trip: totals, then everything recorded, in order.
// backTo: the trips list it was opened from; otherwise back to the dashboard
export function TripDetailScreen({
  id,
  backTo,
}: {
  id: string;
  backTo?: string | null;
}) {
  const trip = useQuery({
    queryKey: ["trip", id],
    queryFn: () => api.reports.trip(id),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });
  const [page, setPage] = useState(1);
  const recordsHeading = useRef<HTMLHeadingElement>(null);

  const back = (
    <Link
      href={backTo ?? "/admin"}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="size-4" />{" "}
      {backTo ? "Trips" : "Dashboard"}
    </Link>
  );

  if (trip.isPending)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back}
        <ContentSkeleton stats />
      </div>
    );
  if (!trip.data)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back}
        <p className="rounded-xl bg-surface p-6 shadow-card">
          {trip.error instanceof ApiError && trip.error.status === 404
            ? "Trip not found."
            : "Couldn't load this trip."}
        </p>
      </div>
    );

  const t = trip.data;
  const { totals } = t;
  const timeline = tripTimeline(t);
  const shown = pageOf(timeline, page);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {back}
      <div className="space-y-1">
        <h1 className={`text-2xl font-semibold tracking-tight ${titleBar}`}>
          {t.worker.name}&apos;s trip
        </h1>
        <p className="text-sm text-muted-foreground">
          Started {when(t.startedAt)} ·{" "}
          {t.endedAt ? `ended ${when(t.endedAt)}` : "Still out"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Picked up"
          value={`${totals.pickedUp.chicken} chickens`}
          sub={`${totals.pickedUp.kilo} kg`}
        />
        <Stat
          label="Sold"
          value={`${totals.sold.chicken} chickens`}
          sub={`${totals.sold.kilo} kg`}
        />
        <Stat
          label="Left on truck"
          value={`${totals.remaining.chicken} chickens`}
          sub={`${totals.remaining.kilo} kg`}
        />
        <Stat
          label="Sales"
          value={peso(totals.sales.amount)}
          sub={`cash ${peso(totals.sales.cash)} · QR ${peso(totals.sales.qr)}`}
        />
        <Stat label="Expenses" value={peso(totals.expenses)} />
        <Stat label="Net" value={peso(totals.net)} />
      </div>

      <section className="overflow-hidden rounded-xl border bg-surface shadow-card">
        <h2
          ref={recordsHeading}
          tabIndex={-1}
          className={`${cardTitle} focus-visible:outline-none`}
        >
          Everything recorded
          <span className={cardCount}>{timeline.length}</span>
        </h2>
        {timeline.length ? (
          <>
            <TripRecords
              trip={t}
              entries={shown.rows}
              className={pagedList(shown.pages)}
              // a checked problem's button goes away: keep focus in the list
              onChecked={() => recordsHeading.current?.focus()}
            />
            <Pager
              page={shown.page}
              pages={shown.pages}
              onPage={setPage}
              label="trip records"
            />
          </>
        ) : (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">
            Nothing recorded yet.
          </p>
        )}
      </section>
    </div>
  );
}
