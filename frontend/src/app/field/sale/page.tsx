"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Banknote, QrCode, TriangleAlert } from "lucide-react";
import { useOffline } from "@/components/offline/offline-provider";
import {
  Field,
  FormHeader,
  inputClass,
  primaryButton,
} from "@/components/trip/form";
import { QrDialog } from "@/components/trip/qr-dialog";
import { useTrip } from "@/components/trip/use-trip";
import type { PaymentMethod } from "@/lib/api/types";
import { getDb, getPaymentQrs } from "@/lib/offline/db";
import { getPrice } from "@/lib/offline/price";
import { InvalidRecordError } from "@/lib/offline/validate";
import { digits, typedAmount } from "@/lib/trip/input";
import { showQrState } from "@/lib/qr/qr";
import { peso, saleAmount, toCenti } from "@/lib/trip/money";
import { overSell } from "@/lib/trip/stock";
import { showDialog } from "@/lib/ui/dialog";

const TWO_DP = /^\d{1,8}(\.\d{1,2})?$/;
const asOf = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function SalePage() {
  const { userId, writer, seesStock } = useOffline();
  const data = useTrip(userId);
  const ownerPrice = useLiveQuery(() => getPrice(getDb()), [], undefined);
  const router = useRouter();
  const warn = useRef<HTMLDialogElement>(null);
  const qrCodes = useLiveQuery(() => getPaymentQrs(getDb()), [], []);
  const qrView = useRef<HTMLDialogElement>(null);

  const [buyerId, setBuyerId] = useState("");
  const [chickens, setChickens] = useState("");
  const [kilo, setKilo] = useState("");
  const [price, setPrice] = useState<string | null>(null); // null = use owner's
  const [payment, setPayment] = useState<PaymentMethod>("CASH");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warning, setWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // no open trip → nothing to sell from
  useEffect(() => {
    if (data && !data.trip) router.replace("/field");
  }, [data, router]);

  if (!data?.trip || ownerPrice === undefined)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  const trip = data.trip;

  const listPrice = ownerPrice?.pricePerKilo;
  const pricePerKilo = price ?? listPrice ?? "";
  const edited =
    !!listPrice &&
    TWO_DP.test(pricePerKilo) &&
    toCenti(pricePerKilo) !== toCenti(listPrice);
  const total =
    TWO_DP.test(kilo) && TWO_DP.test(pricePerKilo)
      ? saleAmount(kilo, pricePerKilo)
      : null;
  // kilos × price can pass as numbers yet outgrow the database column
  const tooBig = total !== null && !TWO_DP.test(total);
  const qr = showQrState(total, tooBig, qrCodes.length);
  const buyers = [...data.activeBuyers].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );

  function check() {
    const e: Record<string, string> = {};
    if (!/^[1-9]\d*$/.test(chickens))
      e.chickens = "Enter how many chickens (at least 1).";
    if (!TWO_DP.test(kilo) || toCenti(kilo) === 0)
      e.kilo = "Enter the weight in kg, up to 2 decimals.";
    if (!TWO_DP.test(pricePerKilo) || toCenti(pricePerKilo) === 0)
      e.price = listPrice
        ? "Enter a price per kg."
        : "No owner price yet — type today's price per kg.";
    setErrors(e);
    return Object.keys(e).length === 0 && !tooBig; // shown under the total
  }

  async function save() {
    setSaving(true);
    try {
      const id = await writer.recordSale({
        tripId: trip.clientId,
        buyerId: buyerId || undefined,
        chickenCount: Number(chickens),
        totalKilo: kilo,
        pricePerKilo,
        listPricePerKilo: listPrice,
        paymentMethod: payment,
      });
      router.replace(`/field/sale/receipt?id=${id}&saved=1`);
    } catch (e) {
      setErrors({
        form:
          e instanceof InvalidRecordError
            ? e.message
            : "Couldn't save the sale.",
      });
      setSaving(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!check()) return;
    const over = overSell(data!.stock, Number(chickens), kilo, {
      showStock: seesStock,
    });
    if (over) {
      setWarning(over);
      showDialog(warn.current);
      return;
    }
    void save();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 pb-4">
      <FormHeader
        title="Sale"
        hint={
          seesStock
            ? `On the truck: ${data.stock.chicken} chickens · ${data.stock.kilo} kg`
            : undefined
        }
      />

      <Field label="Buyer">
        {(a) => (
          <select
            {...a}
            value={buyerId}
            onChange={(e) => setBuyerId(e.target.value)}
            className={inputClass}
          >
            <option value="">Walk-in</option>
            {buyers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Chickens" error={errors.chickens}>
          {(a) => (
            <input
              {...a}
              inputMode="numeric"
              autoComplete="off"
              value={chickens}
              onChange={(e) => setChickens(digits(e.target.value))}
              placeholder="0"
              className={inputClass}
            />
          )}
        </Field>
        <Field label="Kilos" error={errors.kilo}>
          {(a) => (
            <input
              {...a}
              inputMode="decimal"
              autoComplete="off"
              value={kilo}
              onChange={(e) => setKilo(typedAmount(e.target.value))}
              placeholder="0.00"
              className={inputClass}
            />
          )}
        </Field>
      </div>

      <Field
        label="Price per kg (₱)"
        error={errors.price}
        hint={
          edited ? (
            <span className="flex items-center gap-1 text-warning">
              <TriangleAlert aria-hidden className="size-4" /> Price changed —
              the owner will see this sale.
            </span>
          ) : ownerPrice ? (
            `Owner's price as of ${asOf(ownerPrice.setAt)}`
          ) : (
            "No owner price on this phone yet."
          )
        }
      >
        {(a) => (
          <input
            {...a}
            inputMode="decimal"
            autoComplete="off"
            value={pricePerKilo}
            onChange={(e) => setPrice(typedAmount(e.target.value))}
            placeholder="180.00"
            className={inputClass}
          />
        )}
      </Field>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Payment</legend>
        <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
          {(
            [
              ["CASH", "Cash", Banknote],
              ["QR", "QR", QrCode],
            ] as const
          ).map(([value, label, Icon]) => (
            <label
              key={value}
              className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-sm text-base font-medium has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand-100 ${
                payment === value
                  ? "bg-surface shadow-card"
                  : "text-muted-foreground"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value={value}
                checked={payment === value}
                onChange={() => setPayment(value)}
                className="sr-only"
              />
              <Icon aria-hidden className="size-5" /> {label}
            </label>
          ))}
        </div>
        {payment === "QR" && (
          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              onClick={() => showDialog(qrView.current)}
              disabled={!qr.ready}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-input bg-surface text-base font-medium transition-colors hover:bg-muted disabled:text-muted-foreground disabled:hover:bg-surface focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
            >
              <QrCode aria-hidden className="size-5" /> Show QR
            </button>
            {qr.hint && (
              <p className="text-sm text-muted-foreground">{qr.hint}</p>
            )}
          </div>
        )}
      </fieldset>

      <div className="rounded-xl bg-surface p-4 shadow-card" aria-live="polite">
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="text-3xl font-semibold tabular-nums">
          {total ? peso(total) : "—"}
        </p>
        {tooBig && (
          <p className="mt-1 text-sm text-danger">
            Too large to save. Check the kilos and price.
          </p>
        )}
      </div>

      {errors.form && (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      )}
      <button type="submit" disabled={saving} className={primaryButton}>
        {saving ? "Saving…" : "Save sale"}
      </button>

      <dialog
        ref={warn}
        aria-labelledby="oversell-title"
        className="m-auto w-[min(22rem,calc(100%-2rem))] rounded-xl bg-surface p-6 text-foreground shadow-card backdrop:bg-ink-950/50"
      >
        <TriangleAlert aria-hidden className="size-8 text-warning" />
        <h2 id="oversell-title" className="mt-3 text-lg font-semibold">
          More than on the truck
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          {warning} Save anyway? The recount will show the difference.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            data-autofocus
            onClick={() => warn.current?.close()}
            className="min-h-12 rounded-md bg-primary px-4 text-base font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Fix the numbers
          </button>
          <button
            type="button"
            onClick={() => {
              warn.current?.close();
              void save();
            }}
            className="min-h-12 rounded-md border border-input px-4 text-base font-medium hover:bg-muted"
          >
            Save anyway
          </button>
        </div>
      </dialog>
      <QrDialog ref={qrView} codes={qrCodes} total={total ?? "0"} />
    </form>
  );
}
