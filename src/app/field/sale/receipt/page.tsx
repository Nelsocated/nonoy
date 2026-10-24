"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useOffline } from "@/components/offline/offline-provider";
import { Receipt } from "@/components/receipt/receipt";
import { primaryButton } from "@/components/trip/form";
import { getDb } from "@/lib/offline/db";
import { receiptFromLocalSale } from "@/lib/receipt/receipt";
import { peso } from "@/lib/trip/money";
import { ReceiptSkeleton } from "@/components/skeleton";

const back =
  "inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100";

// Built from the sale on the phone, so it works offline right after saving.
function SaleReceipt() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  // "Sale saved" belongs to the moment of saving: remember it for this visit,
  // then drop it from the address so a reload doesn't say it again
  const [saved] = useState(() => params.get("saved") === "1");
  useEffect(() => {
    if (params.has("saved"))
      window.history.replaceState(null, "", `?id=${encodeURIComponent(id)}`);
  }, [params, id]);
  const { userId, userName } = useOffline();

  // null = not on this phone (or someone else's); undefined = still loading
  const found = useLiveQuery(async () => {
    const db = getDb();
    const sale = id ? await db.sales.get(id) : undefined;
    if (!sale || sale.userId !== userId) return null;
    const buyers = await db.buyers.toArray();
    const requests = await db.buyerRequests
      .where("userId")
      .equals(userId)
      .toArray();
    return receiptFromLocalSale(
      sale,
      {
        buyers: new Map(buyers.map((b) => [b.id, b.name])),
        requests: new Map(requests.map((r) => [r.clientId, r])),
      },
      userName,
    );
  }, [id, userId, userName]);

  if (found === undefined) return <ReceiptSkeleton />;
  if (found === null)
    return (
      <section className="space-y-4 rounded-xl bg-surface p-6 text-center shadow-card">
        <h1 className="text-lg font-semibold">Receipt not found</h1>
        <p className="text-sm text-muted-foreground">
          This sale isn&apos;t on this phone.
        </p>
        <Link href="/field" className={primaryButton}>
          Home
        </Link>
      </section>
    );

  return (
    <div className="space-y-5">
      {saved && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success"
        >
          <CircleCheck aria-hidden className="size-5" /> Sale saved ·{" "}
          {peso(found.amount)}
        </p>
      )}
      <Receipt data={found} />
      {saved ? (
        // replace: Back from home shouldn't land on this receipt or the form
        <Link href="/field" replace className={primaryButton}>
          Done
        </Link>
      ) : (
        <div className="flex justify-center">
          <Link href="/field/sales" className={back}>
            Back to today&apos;s sales
          </Link>
        </div>
      )}
    </div>
  );
}

export default function SaleReceiptPage() {
  return (
    <Suspense fallback={<ReceiptSkeleton />}>
      <SaleReceipt />
    </Suspense>
  );
}
