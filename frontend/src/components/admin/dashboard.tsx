"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  ClipboardCheck,
  CloudOff,
  RefreshCw,
  Tag,
  TriangleAlert,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useOnline } from "@/components/offline/use-sync-data";
import { api } from "@/lib/api/browser";
import type { Problem } from "@/lib/api/types";
import { PAGE_SIZE, pagedList, pageOf } from "@/lib/admin/paging";
import { problemSentence } from "@/lib/admin/problems";
import { syncAge, todayInManila } from "@/lib/admin/sync-age";
import { stamp } from "@/lib/admin/timeline";
import { asOf } from "@/lib/offline/admin-cache";
import { peso } from "@/lib/trip/money";
import { CheckProblem } from "./check-problem";
import { Pager } from "./pager";

const REFRESH = 60_000; // TanStack pauses this while the tab is hidden
const time = (iso: string | number) =>
  new Date(iso).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });

const card = "overflow-hidden rounded-xl border bg-surface shadow-card";
const cardTitle =
  "flex items-center justify-between border-b bg-muted/60 px-5 py-2.5 text-sm font-medium";
const count =
  "rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground tabular-nums";

function problemIcon(p: Problem) {
  if (p.kind === "recount") return ClipboardCheck;
  return p.syncStatus === "CONFLICT" ? TriangleAlert : Tag;
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
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {sub && (
        <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>
      )}
    </div>
  );
}

// Owner/admin home: today's totals, who's out right now, problems to check.
export function Dashboard({ name }: { name: string }) {
  const queryClient = useQueryClient();
  const online = useOnline();
  const today = todayInManila();
  const [tripPage, setTripPage] = useState(1);
  const [problemPage, setProblemPage] = useState(1);

  const daily = useQuery({
    queryKey: ["daily", today],
    queryFn: () => api.reports.daily({ from: today, to: today }),
    refetchInterval: REFRESH,
  });
  const trips = useQuery({
    queryKey: ["open-trips"],
    queryFn: () => api.reports.openTrips(),
    refetchInterval: REFRESH,
  });
  const problems = useQuery({
    queryKey: ["problems", problemPage],
    queryFn: () => api.reports.problems(problemPage),
    refetchInterval: REFRESH,
  });

  // re-render each minute so "last synced 12 min ago" keeps moving
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), REFRESH);
    return () => clearInterval(t);
  }, []);

  const total = problems.data?.total ?? 0;
  const problemPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const day = daily.data?.days.find((d) => d.day === today);
  const updated = Math.max(
    daily.dataUpdatedAt,
    trips.dataUpdatedAt,
    problems.dataUpdatedAt,
  );
  const shownTrips = pageOf(trips.data ?? [], tripPage);
  const refreshing =
    daily.isFetching || trips.isFetching || problems.isFetching;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {updated > 0 ? `Updated ${time(updated)}` : "Loading…"}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            void Promise.all(
              [["daily"], ["open-trips"], ["problems"]].map((queryKey) =>
                queryClient.invalidateQueries({ queryKey }),
              ),
            )
          }
          disabled={!online || refreshing}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-surface px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:opacity-50"
        >
          <RefreshCw
            aria-hidden
            className={`size-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
          />
          Refresh
        </button>
      </div>

      {!online && (
        <p className="flex items-center gap-2 text-sm text-warning">
          <CloudOff aria-hidden className="size-4" /> Needs signal to update.
          {updated > 0 && ` ${asOf(updated)}`}
        </p>
      )}

      <section aria-labelledby="today" className="space-y-2">
        <h2 id="today" className="text-sm font-medium text-muted-foreground">
          Today
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Sales"
            value={peso(day?.sales.amount ?? "0")}
            sub={`cash ${peso(day?.sales.cash ?? "0")} · QR ${peso(day?.sales.qr ?? "0")}`}
          />
          <Stat
            label="Kilos sold"
            value={`${day?.sales.kilo ?? "0.00"} kg`}
            sub={`${day?.sales.chicken ?? 0} chickens`}
          />
          <Stat label="Expenses" value={peso(day?.expenses.amount ?? "0")} />
          <Stat label="Net" value={peso(day?.net ?? "0")} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className={card}>
          <h2 className={cardTitle}>
            Out right now
            <span className={count}>{trips.data?.length ?? 0}</span>
          </h2>
          {trips.data?.length ? (
            <>
              <ul className={pagedList(shownTrips.pages)}>
                {shownTrips.rows.map((t) => {
                  const age = syncAge(t.lastSyncedAt, now);
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/admin/trips/${t.id}`}
                        className="group flex h-16 items-center gap-3 px-5 transition-colors hover:bg-primary-soft/50 focus-visible:bg-primary-soft/50 focus-visible:outline-none"
                      >
                        <Truck
                          aria-hidden
                          className="size-5 shrink-0 text-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {t.worker.name}{" "}
                            <span className="font-normal text-muted-foreground">
                              · since {stamp(t.startedAt, now)}
                            </span>
                          </span>
                          <span className="block truncate text-xs text-muted-foreground tabular-nums">
                            {t.remaining.chicken} chickens · {t.remaining.kilo}{" "}
                            kg left · {peso(t.sales.amount)} ·{" "}
                            <span className={age.stale ? "text-warning" : ""}>
                              {age.text}
                            </span>
                          </span>
                        </span>
                        <ChevronRight
                          aria-hidden
                          className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Pager
                page={shownTrips.page}
                pages={shownTrips.pages}
                onPage={setTripPage}
                label="open trips"
              />
            </>
          ) : (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              {trips.isPending ? "Loading…" : "Nobody is out right now."}
            </p>
          )}
        </section>

        <section className={card}>
          <h2 className={cardTitle}>
            Problems to check
            <span
              className={`${count} ${total ? "bg-warning-soft text-warning" : ""}`}
            >
              {total}
            </span>
          </h2>
          {problems.data?.items.length ? (
            <>
              <ul className={pagedList(problemPages)}>
                {problems.data.items.map((p) => {
                  const Icon = problemIcon(p);
                  return (
                    <li
                      key={`${p.kind}:${p.id}`}
                      className="flex h-16 items-center gap-3 pr-3"
                    >
                      <Link
                        href={`/admin/trips/${p.tripId}`}
                        className="flex h-full min-w-0 flex-1 items-center gap-3 pl-5 transition-colors hover:bg-primary-soft/50 focus-visible:bg-primary-soft/50 focus-visible:outline-none"
                      >
                        <Icon
                          aria-hidden
                          className="size-5 shrink-0 text-warning"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {problemSentence(p)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {p.worker.name} · {stamp(p.createdAtClient, now)}
                          </span>
                        </span>
                      </Link>
                      <CheckProblem
                        kind={p.kind}
                        id={p.id}
                        // checked the last row of a later page: step back one
                        onDone={() =>
                          problems.data?.items.length === 1 &&
                          problemPage > 1 &&
                          setProblemPage(problemPage - 1)
                        }
                      />
                    </li>
                  );
                })}
              </ul>
              <Pager
                page={problemPage}
                pages={problemPages}
                onPage={setProblemPage}
                label="problems"
              />
            </>
          ) : (
            <>
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                {problems.isPending
                  ? "Loading…"
                  : problemPage > 1
                    ? "Nothing left on this page."
                    : "Nothing to check."}
              </p>
              {/* rows checked elsewhere can empty a later page: offer a way back */}
              {problemPage > 1 && (
                <Pager
                  page={problemPage}
                  pages={Math.max(problemPage, problemPages)}
                  onPage={setProblemPage}
                  label="problems"
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
