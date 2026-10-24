"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, CloudOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId } from "react";
import { MonthPicker } from "@/components/admin/month-picker";
import { useOnline } from "@/components/offline/use-sync-data";
import { api } from "@/lib/api/browser";
import type { TripListItem } from "@/lib/api/types";
import {
  clampMonth,
  deviceMonth,
  monthLabel,
  monthOf,
  parseMonth,
  type Month,
} from "@/lib/admin/month";
import { PAGE_SIZE, pagedList } from "@/lib/admin/paging";
import { parseWorker, tripDay } from "@/lib/admin/trips";
import { asOf } from "@/lib/offline/admin-cache";
import { peso } from "@/lib/trip/money";
import { cardCount, cardTitle, titleBar } from "@/lib/ui/styles";
import { Pager } from "./pager";
import { SkeletonRows } from "@/components/skeleton";
import { Select } from "@/components/select";

const retry =
  "inline-flex min-h-11 items-center rounded-md border border-input bg-surface px-3 text-sm font-medium hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:opacity-50";

// list columns once the card is wide enough (42rem); narrower, each row
// stacks into two lines
const cols =
  "@2xl:grid @2xl:grid-cols-[6.5rem_minmax(0,1fr)_4.5rem_7rem_7rem_6rem] @2xl:items-center @2xl:gap-3";
const num = "text-right tabular-nums";

function TripRow({ trip, back }: { trip: TripListItem; back: string }) {
  const out = !trip.endedAt;
  const check = trip.problems > 0 && (
    <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-warning">
      {trip.problems} to check
    </span>
  );
  return (
    <li>
      <Link
        href={`/admin/trips/${trip.id}?back=${encodeURIComponent(back)}`}
        className={`flex min-h-16 flex-col justify-center gap-0.5 px-5 py-2 text-sm transition-colors hover:bg-primary-soft/50 focus-visible:bg-primary-soft/50 focus-visible:outline-none ${cols}`}
      >
        {/* narrow: name + day, then the numbers */}
        <span className="flex items-center gap-2 @2xl:hidden">
          <span className="min-w-0 flex-1 truncate font-medium">
            {trip.worker.name}
          </span>
          {check}
          <span className="shrink-0 text-muted-foreground">
            {tripDay(trip.startedAt)}
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-primary" />
        </span>
        <span className="truncate text-xs text-muted-foreground tabular-nums @2xl:hidden">
          {out && (
            <span className="font-semibold text-primary">Still out · </span>
          )}
          {trip.pickedUp.chicken} chickens · {peso(trip.sales.amount)} · net{" "}
          {peso(trip.net)}
        </span>

        {/* wide: one cell per column, labels for screen readers */}
        <span className="hidden @2xl:block">
          <span className="block">{tripDay(trip.startedAt)}</span>
          {out && (
            <span className="block text-xs font-semibold text-primary">
              Still out
            </span>
          )}
        </span>
        <span className="hidden truncate font-medium @2xl:block">
          {trip.worker.name}
        </span>
        <span className={`hidden @2xl:block ${num}`}>
          {trip.pickedUp.chicken}
          <span className="sr-only"> chickens</span>
        </span>
        <span className={`hidden @2xl:block ${num}`}>
          <span className="sr-only">sales </span>
          {peso(trip.sales.amount)}
        </span>
        <span className={`hidden font-medium @2xl:block ${num}`}>
          <span className="sr-only">net </span>
          {peso(trip.net)}
        </span>
        <span className="hidden items-center justify-end gap-2 @2xl:flex">
          {check}
          <ChevronRight aria-hidden className="size-4 shrink-0 text-primary" />
        </span>
      </Link>
    </li>
  );
}

// Owner/admin: every trip in a month (optionally one worker); each row opens
// that trip's page.
export function TripsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const online = useOnline();
  const ids = useId();

  // "today" from the server's report time zone, as on Reports
  const today = useQuery({
    queryKey: ["daily", "today"],
    queryFn: () => api.reports.daily(),
  });
  const todayDay =
    today.isFetching && online && !today.isFetchedAfterMount
      ? undefined
      : today.data?.to;
  // offline with nothing saved: the phone's own month, so saved pages show
  const current = todayDay
    ? monthOf(todayDay)
    : today.fetchStatus === "paused"
      ? deviceMonth()
      : null;
  const month = current
    ? clampMonth(parseMonth(params.get("month")) ?? current, current)
    : null;
  const worker = parseWorker(params.get("worker"));
  const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);

  // month and worker changes start again at page 1
  function query(next: { month?: Month; worker?: string; page?: number }) {
    const q = new URLSearchParams();
    const m = next.month ?? month;
    const w = next.worker ?? worker;
    const p = next.month || next.worker !== undefined ? 1 : (next.page ?? page);
    if (m) q.set("month", m);
    if (w) q.set("worker", w);
    if (p > 1) q.set("page", String(p));
    return `/admin/trips?${q}`;
  }
  const set = (next: Parameters<typeof query>[0]) =>
    router.replace(query(next));

  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => api.users.list(),
  });
  const people = [...(users.data ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const workerName = people.find((u) => u.id === worker)?.name;

  const trips = useQuery({
    queryKey: ["trips", month, worker, page],
    queryFn: () =>
      api.reports.trips({
        month: month!,
        workerId: worker || undefined,
        page,
      }),
    enabled: !!month,
  });
  const label = month ? monthLabel(month) : "";
  const total = trips.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pastEnd =
    !!trips.data && !trips.data.items.length && total > 0 && page > pages;

  // ?page= past the last page (trips removed, old bookmark): go to the last
  useEffect(() => {
    if (pastEnd) router.replace(query({ page: pages }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastEnd, pages]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="space-y-1">
        <h1 className={`text-2xl font-semibold tracking-tight ${titleBar}`}>
          Trips
        </h1>
        <p className="text-3xl font-bold tracking-tight">{label || "…"}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_minmax(12rem,1fr)] sm:items-end">
        <MonthPicker
          value={month}
          current={current}
          onChange={(m) => set({ month: m })}
        />
        <div className="space-y-1">
          <label
            htmlFor={`${ids}-worker`}
            className="block text-xs text-muted-foreground"
          >
            Worker
          </label>
          <Select
            id={`${ids}-worker`}
            value={worker}
            onChange={(v) => set({ worker: v })}
            className="font-medium"
            options={[
              { value: "", label: "All workers" },
              ...people.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </div>
      </div>

      {!online && (
        <p className="flex items-center gap-2 text-sm text-warning">
          <CloudOff aria-hidden className="size-4" /> Needs signal to update.
          {trips.dataUpdatedAt > 0 && ` ${asOf(trips.dataUpdatedAt)}`}
        </p>
      )}

      <section className="@container overflow-hidden rounded-xl border bg-surface shadow-card">
        <h2 className={cardTitle}>
          Trips in {label || "…"}
          <span className={cardCount}>{total}</span>
        </h2>
        {!trips.data ? (
          trips.fetchStatus === "paused" ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              {label || "This month"} isn&apos;t saved on this device yet.
            </p>
          ) : trips.isError || today.isError ? (
            <div className="space-y-3 px-5 py-6 text-center">
              <p className="text-sm text-danger">
                Couldn&apos;t load the trips.
              </p>
              <button
                type="button"
                onClick={() =>
                  void (today.isError ? today.refetch() : trips.refetch())
                }
                disabled={!online}
                className={retry}
              >
                Try again
              </button>
            </div>
          ) : (
            <SkeletonRows />
          )
        ) : pastEnd ? (
          <SkeletonRows />
        ) : trips.data.items.length ? (
          <>
            <div
              aria-hidden
              className={`hidden border-b px-5 py-2 text-xs text-muted-foreground ${cols}`}
            >
              <span>Date</span>
              <span>Worker</span>
              <span className={num}>Chickens</span>
              <span className={num}>Sales</span>
              <span className={num}>Net</span>
              <span />
            </div>
            <ul className={pagedList(pages)}>
              {trips.data.items.map((t) => (
                <TripRow key={t.id} trip={t} back={query({})} />
              ))}
            </ul>
            <Pager
              page={page}
              pages={pages}
              onPage={(p) => set({ page: p })}
              label="trips"
            />
          </>
        ) : (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">
            {!worker
              ? `No trips in ${label}.`
              : `No trips for ${workerName ?? "this worker"} in ${label}.`}
          </p>
        )}
      </section>
    </div>
  );
}
