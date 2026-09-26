import { Banknote, QrCode } from "lucide-react";
import { Logo } from "@/components/logo";
import type { ReceiptData } from "@/lib/receipt/receipt";
import { peso } from "@/lib/trip/money";

const issued = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={`text-right text-sm font-medium tabular-nums ${mono ? "font-mono tracking-wide" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

// A sale's receipt, same on the phone and the admin side. Paper card, one red band.
export function Receipt({ data }: { data: ReceiptData }) {
  const qr = data.paymentMethod === "QR";
  const Paid = qr ? QrCode : Banknote;
  return (
    <section
      aria-labelledby="receipt-title"
      className="mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-surface shadow-card"
    >
      <div aria-hidden className="h-1.5 bg-primary" />
      <div className="px-6 py-6">
        <header className="flex flex-col items-center gap-1.5 text-center">
          <Logo className="size-14" />
          <p className="mt-1 text-lg font-semibold tracking-tight">
            Mang Frito
          </p>
          <h1
            id="receipt-title"
            className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
          >
            Official receipt
          </h1>
        </header>

        <dl className="mt-5 border-t border-dashed border-border pt-3">
          <Row label="Receipt no." value={data.code} mono />
          <Row label="Date" value={issued(data.issuedAt)} />
          <Row label="Worker" value={data.workerName} />
          <Row label="Buyer" value={data.buyerName} />
        </dl>

        <dl className="mt-3 border-t border-dashed border-border pt-3">
          <Row label="Chickens" value={String(data.chickenCount)} />
          <Row label="Weight" value={`${data.totalKilo} kg`} />
          {data.pricePerKilo && (
            <Row label="Price per kg" value={peso(data.pricePerKilo)} />
          )}
        </dl>

        <div className="mt-4 flex items-baseline justify-between gap-4 rounded-lg bg-muted px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">
            Total
          </span>
          <span className="text-2xl font-bold tabular-nums">
            {peso(data.amount)}
          </span>
        </div>

        <p className="mt-3 flex justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium">
            <Paid aria-hidden className="size-3.5 text-primary" />
            Paid by {qr ? "QR" : "cash"}
          </span>
        </p>

        <p className="mt-5 border-t border-dashed border-border pt-4 text-center text-xs text-muted-foreground">
          Thank you for your purchase!
        </p>
      </div>
    </section>
  );
}
