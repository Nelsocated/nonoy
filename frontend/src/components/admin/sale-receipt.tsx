"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Receipt } from "@/components/receipt/receipt";
import { ApiError } from "@/lib/api";
import { api } from "@/lib/api/browser";
import { receiptFromServer } from "@/lib/receipt/receipt";

const backClass =
  "inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground";

// a bad id (400) or unknown sale (404) won't get better by retrying
const notFound = (e: unknown) =>
  e instanceof ApiError && (e.status === 404 || e.status === 400);

// Owner/admin view of one sale's receipt, reached from the trip timeline.
export function SaleReceiptScreen({ clientId }: { clientId: string }) {
  const sale = useQuery({
    queryKey: ["receipt", clientId],
    queryFn: () => api.sales.receipt(clientId),
    retry: (n, e) => !notFound(e) && n < 2,
  });

  const back = (href: string, label: string) => (
    <Link href={href} className={backClass}>
      <ArrowLeft aria-hidden className="size-4" /> {label}
    </Link>
  );

  if (sale.isPending)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back("/admin", "Dashboard")}
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  if (!sale.data)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back("/admin", "Dashboard")}
        <p className="rounded-xl bg-surface p-6 shadow-card">
          {notFound(sale.error)
            ? "Receipt not found."
            : "Couldn't load this receipt."}
        </p>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {back(`/admin/trips/${sale.data.tripId}`, "Back to trip")}
      <Receipt data={receiptFromServer(sale.data)} />
    </div>
  );
}
