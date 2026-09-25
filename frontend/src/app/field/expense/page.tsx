"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOffline } from "@/components/offline/offline-provider";
import {
  Field,
  FormHeader,
  inputClass,
  primaryButton,
} from "@/components/trip/form";
import { useTrip } from "@/components/trip/use-trip";
import { InvalidRecordError } from "@/lib/offline/validate";
import { typedAmount } from "@/lib/trip/input";
import { peso, toCenti } from "@/lib/trip/money";

const QUICK = ["Gas", "Food", "Toll", "Parking"];
const TWO_DP = /^\d{1,8}(\.\d{1,2})?$/;

export default function ExpensePage() {
  const { userId, writer } = useOffline();
  const data = useTrip(userId);
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [onTrip, setOnTrip] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const trip = data.trip;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!description.trim()) err.description = "What was it for?";
    else if (description.trim().length > 200)
      err.description = "Keep it under 200 characters.";
    if (!TWO_DP.test(amount) || toCenti(amount) === 0)
      err.amount = "Enter the amount in pesos, up to 2 decimals.";
    setErrors(err);
    if (Object.keys(err).length) return;

    setSaving(true);
    try {
      await writer.recordExpense({
        description,
        amount,
        tripId: trip && onTrip ? trip.clientId : undefined,
      });
      router.replace(
        `/field?saved=${encodeURIComponent(`Expense saved · ${description.trim()} ${peso(amount)}`)}`,
      );
    } catch (e) {
      setErrors({
        form:
          e instanceof InvalidRecordError
            ? e.message
            : "Couldn't save the expense.",
      });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 pb-4">
      <FormHeader title="Expense" hint="Money you spent for work." />

      <div className="space-y-2">
        <Field label="What for" error={errors.description}>
          {(a) => (
            <input
              {...a}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              placeholder="e.g. Gas"
              className={inputClass}
            />
          )}
        </Field>
        <div className="flex flex-wrap gap-2" aria-label="Quick picks">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setDescription(q)}
              aria-pressed={description === q}
              className={`min-h-11 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 ${
                description === q
                  ? "bg-primary-soft text-primary-soft-foreground"
                  : "bg-muted text-foreground hover:bg-ink-200"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <Field label="Amount (₱)" error={errors.amount}>
        {(a) => (
          <input
            {...a}
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(typedAmount(e.target.value))}
            placeholder="0.00"
            className={inputClass}
          />
        )}
      </Field>

      {trip ? (
        <label className="flex min-h-12 items-center gap-3 rounded-md bg-surface px-4 shadow-card">
          <input
            type="checkbox"
            checked={onTrip}
            onChange={(e) => setOnTrip(e.target.checked)}
            className="size-5 accent-primary"
          />
          <span className="text-base">Part of this trip</span>
        </label>
      ) : (
        <p className="text-sm text-muted-foreground">
          No trip open — saved as a general expense.
        </p>
      )}

      {errors.form && (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      )}
      <button type="submit" disabled={saving} className={primaryButton}>
        {saving ? "Saving…" : "Save expense"}
      </button>
    </form>
  );
}
