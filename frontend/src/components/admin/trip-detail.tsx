"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardCheck,
  PackagePlus,
  Receipt,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { api } from "@/lib/api/browser";
import { pagedList, pageOf } from "@/lib/admin/paging";
import { problemSentence } from "@/lib/admin/problems";
import { stamp, tripTimeline, type TimelineEntry } from "@/lib/admin/timeline";
import { peso, twoDp } from "@/lib/trip/money";
import { CheckProblem } from "./check-problem";
import { Pager } from "./pager";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const ICON = {
  pickup: PackagePlus,
  sale: Receipt,
  recount: ClipboardCheck,
  expense: Wallet,
};

function describe(e: TimelineEntry): { title: string; detail: string } {
  switch (e.type) {
    case "pickup":
      return {
        title: `Pickup · ${e.row.plantation.name}`,
        detail: `${e.row.chickenCount} chickens · ${twoDp(e.row.totalKilo)} kg`,
      };
    case "sale":
      return {
        title: `Sale · ${e.row.buyer?.name ?? "Walk-in"} · ${peso(e.row.amount)}`,
        detail: `${e.row.chickenCount} chickens · ${twoDp(e.row.totalKilo)} kg${
          e.row.pricePerKilo ? ` · ${peso(e.row.pricePerKilo)}/kg` : ""
        } · ${e.row.paymentMethod === "QR" ? "QR" : "Cash"}`,
      };
    case "recount":
      return {
        title: "Recount",
        detail: `Counted ${e.row.countedChicken} chickens · ${twoDp(e.row.countedKilo)} kg (expected ${e.row.expectedChicken} · ${twoDp(e.row.expectedKilo)} kg)`,
      };
    case "expense":
      return {
        title: `Expense · ${peso(e.row.amount)}`,
        detail: e.row.description,
      };
  }
}

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
    <div className="rounded-xl border bg-surface p-4 shadow-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {sub && (
        <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>
      )}
    </div>
  );
}

// Owner/admin view of one trip: totals, then everything recorded, in order.
export function TripDetailScreen({ id }: { id: string }) {
  const trip = useQuery({
    queryKey: ["trip", id],
    queryFn: () => api.reports.trip(id),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });
  const [page, setPage] = useState(1);
  const recordsHeading = useRef<HTMLHeadingElement>(null);

  const back = (
    <Link
      href="/admin"
      className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="size-4" /> Dashboard
    </Link>
  );

  if (trip.isPending)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back}
        <p className="text-sm text-muted-foreground">Loading…</p>
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
        <h1 className="text-2xl font-semibold tracking-tight">
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
          className="flex items-center justify-between border-b bg-muted/60 px-5 py-2.5 text-sm font-medium focus-visible:outline-none"
        >
          Everything recorded
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
            {timeline.length}
          </span>
        </h2>
        {timeline.length ? (
          <>
            <ul className={pagedList(shown.pages)}>
              {shown.rows.map((e) => {
                const Icon = e.problem ? TriangleAlert : ICON[e.type];
                const open =
                  e.problem &&
                  !(e.row as { checkedAt?: string | null }).checkedAt;
                const note = (e.row as { checkNote?: string | null }).checkNote;
                const { title, detail } = describe(e);
                return (
                  <li
                    key={e.key}
                    className={`flex h-16 items-center gap-3 px-5 ${open ? "bg-warning-soft" : ""}`}
                  >
                    <Icon
                      aria-hidden
                      className={`size-5 shrink-0 ${open ? "text-warning" : "text-primary"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {e.problem ? problemSentence(e.problem) : title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {stamp(e.at, t.startedAt)} · {detail}
                        {e.problem && !open && (
                          <> · Checked{note ? ` — ${note}` : ""}</>
                        )}
                      </span>
                    </span>
                    {open && e.problem && (
                      <CheckProblem
                        kind={e.problem.kind}
                        id={e.row.id}
                        // its button goes away once checked
                        onDone={() => recordsHeading.current?.focus()}
                      />
                    )}
                    {e.type === "sale" && (
                      <Link
                        href={`/admin/receipts/${e.row.clientId}`}
                        // every row says "Receipt": tell screen readers which one
                        aria-label={`Receipt: ${e.row.buyer?.name ?? "Walk-in"}, ${peso(e.row.amount)}, ${stamp(e.at, t.startedAt)}`}
                        className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm font-medium text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
                      >
                        Receipt
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
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
