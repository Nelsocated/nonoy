"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CloudOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { MonthPicker } from "@/components/admin/month-picker";
import { useOnline } from "@/components/offline/use-sync-data";
import { api } from "@/lib/api/browser";
import type { TripListItem } from "@/lib/api/types";
import {
  clampMonth,
  monthLabel,
  monthOf,
  parseMonth,
  type Month,
} from "@/lib/admin/month";
import { PAGE_SIZE, pagedList } from "@/lib/admin/paging";
import { tripTimeline } from "@/lib/admin/timeline";
import { tripTimes } from "@/lib/admin/trips";
import { asOf } from "@/lib/offline/admin-cache";
import { peso } from "@/lib/trip/money";
import { cardCount, cardTitle, titleBar } from "@/lib/ui/styles";
import { Pager } from "./pager";
import { TripRecords } from "./trip-records";

const select =
  "min-h-11 w-full appearance-none rounded-md border border-input bg-surface py-2 pr-9 pl-3 text-base font-medium outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100";
const retry =
  "inline-flex min-h-11 items-center rounded-md border border-input bg-surface px-3 text-sm font-medium hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:opacity-50";

// What was recorded on one trip, loaded when its row is opened.
function TripPanel({ id }: { id: string }) {
  const online = useOnline();
  const trip = useQuery({
    queryKey: ["trip", id],
    queryFn: () => api.reports.trip(id),
  });
  const line = "px-5 py-4 text-sm text-muted-foreground";

  if (!trip.data) {
    if (trip.fetchStatus === "paused")
      return (
        <p className={line}>This trip isn&apos;t saved on this device yet.</p>
      );
    if (trip.isError)
      return (
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <p className="text-sm text-danger">Couldn&apos;t load this trip.</p>
          <button
            type="button"
            onClick={() => void trip.refetch()}
            disabled={!online}
            className={retry}
          >
            Try again
          </button>
        </div>
      );
    return (
      <p role="status" className={line}>
        Loading…
      </p>
    );
  }
  const entries = tripTimeline(trip.data);
  return (
    <div className="border-t border-brand-100 bg-background/60">
      {entries.length ? (
        <TripRecords trip={trip.data} entries={entries} className="divide-y" />
      ) : (
        <p className={line}>Nothing recorded yet.</p>
      )}
      <Link
        href={`/admin/trips/${id}`}
        className="flex min-h-11 items-center justify-end gap-1 border-t px-5 text-sm font-medium text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
      >
        Open trip page <ChevronRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

function TripRow({
  trip,
  open,
  onToggle,
}: {
  trip: TripListItem;
  open: boolean;
  onToggle: () => void;
}) {
  const panel = useId();
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panel}
        className="flex min-h-16 w-full items-center gap-3 px-5 py-2 text-left transition-colors hover:bg-primary-soft/50 focus-visible:bg-primary-soft/50 focus-visible:outline-none"
      >
        <ChevronDown
          aria-hidden
          className={`size-5 shrink-0 text-primary transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {trip.worker.name}{" "}
            <span className="font-normal text-muted-foreground">
              · {tripTimes(trip.startedAt, trip.endedAt)}
            </span>
          </span>
          <span className="block truncate text-xs text-muted-foreground tabular-nums">
            {trip.pickedUp.chicken} chickens · {peso(trip.sales.amount)} · net{" "}
            {peso(trip.net)}
          </span>
        </span>
        {trip.problems > 0 && (
          <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
            {trip.problems} to check
          </span>
        )}
      </button>
      {open && (
        <div id={panel}>
          <TripPanel id={trip.id} />
        </div>
      )}
    </li>
  );
}

// Owner/admin: every trip in a month (optionally one worker), rows open in
// place to show what was recorded.
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
  const current = todayDay ? monthOf(todayDay) : null;
  const month = current
    ? clampMonth(parseMonth(params.get("month")) ?? current, current)
    : null;
  const worker = params.get("worker") ?? "";
  const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);

  // month and worker changes start again at page 1
  function set(next: { month?: Month; worker?: string; page?: number }) {
    const q = new URLSearchParams();
    const m = next.month ?? month;
    const w = next.worker ?? worker;
    const p = next.month || next.worker !== undefined ? 1 : (next.page ?? page);
    if (m) q.set("month", m);
    if (w) q.set("worker", w);
    if (p > 1) q.set("page", String(p));
    router.replace(`/admin/trips?${q}`);
  }

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
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setOpened((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const label = month ? monthLabel(month) : "";
  const total = trips.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
          <div className="relative">
            <select
              id={`${ids}-worker`}
              value={worker}
              onChange={(e) => set({ worker: e.target.value })}
              className={select}
            >
              <option value="">All workers</option>
              {people.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary"
            />
          </div>
        </div>
      </div>

      {!online && (
        <p className="flex items-center gap-2 text-sm text-warning">
          <CloudOff aria-hidden className="size-4" /> Needs signal to update.
          {trips.dataUpdatedAt > 0 && ` ${asOf(trips.dataUpdatedAt)}`}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border bg-surface shadow-card">
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
            <p
              role="status"
              className="px-5 py-6 text-center text-sm text-muted-foreground"
            >
              Loading…
            </p>
          )
        ) : trips.data.items.length ? (
          <>
            <ul className={`divide-y ${pagedList(pages)}`}>
              {trips.data.items.map((t) => (
                <TripRow
                  key={t.id}
                  trip={t}
                  open={opened.has(t.id)}
                  onToggle={() => toggle(t.id)}
                />
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
            {workerName
              ? `No trips for ${workerName} in ${label}.`
              : `No trips in ${label}.`}
          </p>
        )}
      </section>
    </div>
  );
}
