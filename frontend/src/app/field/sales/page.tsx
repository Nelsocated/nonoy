"use client";

import { ChevronRight, Receipt } from "lucide-react";
import Link from "next/link";
import { useOffline } from "@/components/offline/offline-provider";
import { useTrip } from "@/components/trip/use-trip";
import { receiptCode } from "@/lib/receipt/receipt";
import { peso } from "@/lib/trip/money";
import { titleBar } from "@/lib/ui/styles";
import { FieldPageSkeleton } from "@/components/skeleton";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });

// Today's sales, newest first; tap one to show its receipt again.
export default function SalesPage() {
  const { userId } = useOffline();
  const data = useTrip(userId);
  if (!data) return <FieldPageSkeleton />;
  const { todaySales, buyers } = data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className={`text-xl font-semibold tracking-tight ${titleBar}`}>
          Today&apos;s sales
        </h1>
        <p className="text-sm text-muted-foreground">
          Tap a sale to show its receipt.
        </p>
      </div>
      {todaySales.length ? (
        <ul className="divide-y rounded-xl bg-surface shadow-card">
          {todaySales.map((s) => (
            <li key={s.clientId}>
              <Link
                href={`/field/sale/receipt?id=${s.clientId}`}
                className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
              >
                <Receipt aria-hidden className="size-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {s.buyerId ? (buyers.get(s.buyerId) ?? "Buyer") : "Walk-in"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {time(s.createdAtClient)} ·{" "}
                    <span className="font-mono">{receiptCode(s.clientId)}</span>
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {peso(s.amount)}
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-surface p-5 text-sm text-muted-foreground shadow-card">
          No sales yet today.
        </p>
      )}
    </div>
  );
}
