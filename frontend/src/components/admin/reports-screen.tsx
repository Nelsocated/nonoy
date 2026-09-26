"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudOff, Printer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { MonthPicker } from "@/components/admin/month-picker";
import { useOnline } from "@/components/offline/use-sync-data";
import { api } from "@/lib/api/browser";
import {
  clampMonth,
  daysUpTo,
  deviceDay,
  monthLabel,
  monthOf,
  monthRange,
  monthTotals,
  parseMonth,
} from "@/lib/admin/month";
import { asOf } from "@/lib/offline/admin-cache";
import { peso, twoDp } from "@/lib/trip/money";
import { cardTitle, statCard, titleBar } from "@/lib/ui/styles";
import { ContentSkeleton } from "@/components/skeleton";

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-surface px-3 text-sm font-medium transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:opacity-50";
// its own class, not `button` + overrides: bg-surface sits later in the CSS
// than bg-primary, so combining them left a white button with white text
const printButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:opacity-50";
const num = "px-3 py-2 text-right tabular-nums whitespace-nowrap";

const dayName = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const printedAt = () =>
  new Date().toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
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
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {sub && (
        <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>
      )}
    </div>
  );
}

// Owner/admin: one month at a glance — totals and every day — printable.
export function ReportsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const online = useOnline();

  // "today" from the server's report time zone (shared with the dashboard)
  const today = useQuery({
    queryKey: ["daily", "today"],
    queryFn: () => api.reports.daily(),
  });
  // the dashboard's cached copy may be from yesterday (a new month at
  // midnight): online, wait for the refresh; offline, the saved one will do
  // offline with nothing saved: the phone's own day, so saved months show
  const todayDay =
    today.isFetching && online && !today.isFetchedAfterMount
      ? undefined
      : (today.data?.to ??
        (today.fetchStatus === "paused" ? deviceDay() : undefined));
  const current = todayDay ? monthOf(todayDay) : null;
  const month = current
    ? clampMonth(parseMonth(params.get("month")) ?? current, current)
    : null;

  const report = useQuery({
    queryKey: ["month", month],
    queryFn: () => api.reports.daily(monthRange(month!)),
    enabled: !!month,
  });

  const go = (m: string) => router.replace(`/admin/reports?month=${m}`);
  const days =
    report.data && todayDay ? daysUpTo(report.data.days, todayDay) : [];
  const t = monthTotals(days);
  const label = month ? monthLabel(month) : "";

  // the time on paper is when it was printed, not when the page opened
  const [printed, setPrinted] = useState(printedAt);
  useEffect(() => {
    const stamp = () => setPrinted(printedAt());
    window.addEventListener("beforeprint", stamp);
    return () => window.removeEventListener("beforeprint", stamp);
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* only on paper */}
      <div className="hidden items-center gap-3 border-b pb-3 print:flex">
        <Logo className="size-10" />
        <div>
          <p className="font-semibold">Mang Frito · Monthly sales summary</p>
          <p className="text-sm">Printed {printed}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className={`text-2xl font-semibold tracking-tight ${titleBar}`}>
            Reports
          </h1>
          <p className="text-3xl font-bold tracking-tight">{label || "…"}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2 print:hidden">
          <MonthPicker value={month} current={current} onChange={go} />
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!report.data}
            className={printButton}
          >
            <Printer aria-hidden className="size-5" /> Print
          </button>
        </div>
      </div>

      {!online && (
        <p className="flex items-center gap-2 text-sm text-warning print:hidden">
          <CloudOff aria-hidden className="size-4" /> Needs signal to update.
          {report.dataUpdatedAt > 0 && ` ${asOf(report.dataUpdatedAt)}`}
        </p>
      )}

      {!report.data ? (
        report.isError || today.isError ? (
          <div className="space-y-3 rounded-xl bg-surface p-6 text-center shadow-card">
            <p className="text-sm text-danger">
              Couldn&apos;t load this month.
            </p>
            <button
              type="button"
              onClick={() =>
                void (today.isError ? today.refetch() : report.refetch())
              }
              disabled={!online}
              className={button}
            >
              Try again
            </button>
          </div>
        ) : report.fetchStatus === "paused" ? (
          // offline and this month was never opened on this device
          <p className="rounded-xl bg-surface p-6 text-center text-muted-foreground shadow-card">
            {label || "This month"} isn&apos;t saved on this device yet. Connect
            to load it.
          </p>
        ) : (
          <ContentSkeleton stats />
        )
      ) : t.activeDays === 0 ? (
        <p className="rounded-xl bg-surface p-6 text-center text-muted-foreground shadow-card">
          Nothing recorded in {label}.
        </p>
      ) : (
        <>
          <section aria-labelledby="month-totals" className="space-y-2">
            <h2
              id="month-totals"
              className="text-sm font-semibold text-primary"
            >
              Month totals
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 print:grid-cols-3">
              <Stat
                label="Sales"
                value={peso(t.amount)}
                sub={`cash ${peso(t.cash)} · QR ${peso(t.qr)}`}
              />
              <Stat label="Number of sales" value={String(t.sales)} />
              <Stat label="Chickens sold" value={String(t.chicken)} />
              <Stat label="Kilos sold" value={`${t.kilo} kg`} />
              <Stat label="Expenses" value={peso(t.expenses)} />
              <Stat label="Net" value={peso(t.net)} />
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              Picked up {t.pickedChicken} chickens · {t.pickedKilo} kg · active
              on {t.activeDays} {t.activeDays === 1 ? "day" : "days"}
            </p>
          </section>

          <section
            aria-labelledby="day-by-day"
            className="overflow-hidden rounded-xl border bg-surface shadow-card print:overflow-visible print:shadow-none"
          >
            <h2 id="day-by-day" className={cardTitle}>
              Day by day
            </h2>
            {/* phones scroll the table, not the page */}
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[44rem] text-sm print:min-w-0">
                <caption className="sr-only">
                  Sales and expenses for each day of {label}
                </caption>
                <thead className="border-b bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 bg-muted px-3 py-2 text-left print:static"
                    >
                      Date
                    </th>
                    <th scope="col" className={num}>
                      Sales
                    </th>
                    <th scope="col" className={num}>
                      Chickens
                    </th>
                    <th scope="col" className={num}>
                      Kilos
                    </th>
                    <th scope="col" className={num}>
                      Cash
                    </th>
                    <th scope="col" className={num}>
                      QR
                    </th>
                    <th scope="col" className={num}>
                      Total
                    </th>
                    <th scope="col" className={num}>
                      Expenses
                    </th>
                    <th scope="col" className={num}>
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {days.map((d) => {
                    const empty =
                      !d.sales.count && !d.expenses.count && !d.pickups.chicken;
                    const dash = (v: string) => (empty ? "—" : v);
                    return (
                      <tr
                        key={d.day}
                        className={empty ? "text-muted-foreground" : ""}
                      >
                        <th
                          scope="row"
                          className="sticky left-0 bg-surface px-3 py-2 text-left font-medium whitespace-nowrap print:static"
                        >
                          {dayName(d.day)}
                        </th>
                        <td className={num}>{dash(String(d.sales.count))}</td>
                        <td className={num}>{dash(String(d.sales.chicken))}</td>
                        <td className={num}>{dash(twoDp(d.sales.kilo))}</td>
                        <td className={num}>{dash(peso(d.sales.cash))}</td>
                        <td className={num}>{dash(peso(d.sales.qr))}</td>
                        <td className={`${num} font-medium`}>
                          {dash(peso(d.sales.amount))}
                        </td>
                        <td className={num}>{dash(peso(d.expenses.amount))}</td>
                        <td className={`${num} font-medium`}>
                          {dash(peso(d.net))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 font-semibold">
                  <tr>
                    <th
                      scope="row"
                      className="sticky left-0 bg-surface px-3 py-2 text-left print:static"
                    >
                      Total
                    </th>
                    <td className={num}>{t.sales}</td>
                    <td className={num}>{t.chicken}</td>
                    <td className={num}>{t.kilo}</td>
                    <td className={num}>{peso(t.cash)}</td>
                    <td className={num}>{peso(t.qr)}</td>
                    <td className={num}>{peso(t.amount)}</td>
                    <td className={num}>{peso(t.expenses)}</td>
                    <td className={num}>{peso(t.net)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
