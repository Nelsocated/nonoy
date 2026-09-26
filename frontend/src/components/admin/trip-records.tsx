"use client";

import {
  ClipboardCheck,
  PackagePlus,
  Receipt,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import type { TripDetail } from "@/lib/api/types";
import { saleBuyerLabel } from "@/lib/admin/buyer-label";
import { problemSentence } from "@/lib/admin/problems";
import { stamp, type TimelineEntry } from "@/lib/admin/timeline";
import { peso, twoDp } from "@/lib/trip/money";
import { CheckProblem } from "./check-problem";

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
        title: `Sale · ${saleBuyerLabel(e.row)} · ${peso(e.row.amount)}`,
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

// The records of one trip, one row each (trip page and the trips list), with
// problems tinted and a Checked button, and a receipt link on every sale.
export function TripRecords({
  trip,
  entries,
  className = "",
  onChecked,
}: {
  trip: TripDetail;
  entries: TimelineEntry[];
  className?: string;
  onChecked?: () => void;
}) {
  return (
    <ul className={className}>
      {entries.map((e) => {
        const Icon = e.problem ? TriangleAlert : ICON[e.type];
        const open =
          e.problem && !(e.row as { checkedAt?: string | null }).checkedAt;
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
                {stamp(e.at, trip.startedAt)} · {detail}
                {e.problem && !open && (
                  <> · Checked{note ? ` — ${note}` : ""}</>
                )}
              </span>
            </span>
            {open && e.problem && (
              <CheckProblem
                kind={e.problem.kind}
                id={e.row.id}
                onDone={onChecked}
              />
            )}
            {e.type === "sale" && (
              <Link
                href={`/admin/receipts/${e.row.clientId}`}
                // every row says "Receipt": tell screen readers which one
                aria-label={`Receipt: ${saleBuyerLabel(e.row)}, ${peso(e.row.amount)}, ${stamp(e.at, trip.startedAt)}`}
                className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm font-medium text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
              >
                Receipt
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
