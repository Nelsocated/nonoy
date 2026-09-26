"use client";

import { forwardRef, useState } from "react";
import { QrImage } from "@/components/qr/qr-image";
import type { LocalPaymentQr } from "@/lib/offline/db";
import { peso } from "@/lib/trip/money";
import { primaryButton } from "./form";

// Full-screen payment QR over the sale form. It sits inside the form, so every
// button here is type="button" — closing or switching never saves the sale.
export const QrDialog = forwardRef<
  HTMLDialogElement,
  { codes: LocalPaymentQr[]; total: string }
>(function QrDialog({ codes, total }, ref) {
  const [picked, setPicked] = useState(0);
  const code = codes[Math.min(picked, codes.length - 1)];
  const close = () =>
    (ref as React.RefObject<HTMLDialogElement | null>).current?.close();

  return (
    <dialog
      ref={ref}
      aria-labelledby="qr-pay-title"
      className="m-0 h-dvh max-h-none w-full max-w-none bg-surface p-0 text-foreground backdrop:bg-ink-950/50"
    >
      <div className="mx-auto flex h-full max-w-md flex-col gap-5 px-4 py-6">
        <div className="text-center">
          <h2
            id="qr-pay-title"
            className="text-sm font-medium text-muted-foreground"
          >
            Amount to pay
          </h2>
          <p className="text-4xl font-semibold tabular-nums">{peso(total)}</p>
        </div>

        {codes.length > 1 && (
          <div
            role="group"
            aria-label="QR code"
            className="flex gap-1 overflow-x-auto rounded-md bg-muted p-1"
          >
            {codes.map((c, i) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={c === code}
                onClick={() => setPicked(i)}
                className={`min-h-11 flex-1 shrink-0 rounded-sm px-3 text-base font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 ${
                  c === code
                    ? "bg-surface shadow-card"
                    : "text-muted-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          {code && (
            <>
              <QrImage
                payload={code.payload}
                label={code.label}
                className="w-full max-w-[22rem]"
              />
              <p className="text-center text-sm text-muted-foreground">
                {code.label} · Ask the buyer to scan and pay
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          autoFocus
          onClick={close}
          className={primaryButton}
        >
          Close
        </button>
      </div>
    </dialog>
  );
});
