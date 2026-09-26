"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { useOffline } from "@/components/offline/offline-provider";
import {
  Field,
  FormHeader,
  inputClass,
  primaryButton,
} from "@/components/trip/form";
import { useTrip } from "@/components/trip/use-trip";
import { InvalidRecordError } from "@/lib/offline/validate";
import { digits, typedAmount } from "@/lib/trip/input";
import { recountResult, type Stock } from "@/lib/trip/stock";
import { FormSkeleton } from "@/components/skeleton";

const TWO_DP = /^\d{1,8}(\.\d{1,2})?$/;

type Result = ReturnType<typeof recountResult> & { expected: Stock };

const describe = (n: number, unit: string, abs: string) =>
  `${n < 0 ? "Short" : "Over"} ${abs} ${unit}`;

// Blind count: the worker enters what they count without seeing the expected
// numbers, so the check means something. The difference shows after saving.
export default function RecountPage() {
  const { userId, writer } = useOffline();
  const data = useTrip(userId);
  const router = useRouter();

  const [chickens, setChickens] = useState("");
  const [kilo, setKilo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (data && !data.trip && !result) router.replace("/field");
  }, [data, result, router]);

  if (!data) return <FormSkeleton />;

  if (result) {
    const diffs = [
      result.chickenDiff !== 0 &&
        describe(
          result.chickenDiff,
          "chickens",
          String(Math.abs(result.chickenDiff)),
        ),
      result.kiloDiff !== "0.00" &&
        describe(
          result.kiloDiff.startsWith("-") ? -1 : 1,
          "kg",
          result.kiloDiff.replace("-", ""),
        ),
    ].filter(Boolean);
    return (
      <div className="space-y-5">
        <FormHeader title="Recount saved" />
        <section
          role="status"
          className={`space-y-2 rounded-xl p-5 ${
            result.matches
              ? "bg-success-soft text-success"
              : "bg-warning-soft text-warning"
          }`}
        >
          {result.matches ? (
            <CircleCheck aria-hidden className="size-8" />
          ) : (
            <TriangleAlert aria-hidden className="size-8" />
          )}
          <p className="text-xl font-semibold">
            {result.matches ? "Matches ✓" : diffs.join(" · ")}
          </p>
          <p className="text-sm">
            Expected {result.expected.chicken} chickens · {result.expected.kilo}{" "}
            kg on the truck.
            {!result.matches && " The owner will see this difference."}
          </p>
        </section>
        <Link href="/field" className={primaryButton}>
          Back to trip
        </Link>
      </div>
    );
  }

  if (!data.trip) return <FormSkeleton />;
  const trip = data.trip;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!/^\d+$/.test(chickens))
      err.chickens = "Enter how many chickens you counted (0 is fine).";
    if (!TWO_DP.test(kilo)) err.kilo = "Enter the weight in kg (0 is fine).";
    setErrors(err);
    if (Object.keys(err).length) return;

    // expected = what the phone says should be on the truck right now
    const expected = data!.stock;
    setSaving(true);
    try {
      await writer.recordRecount({
        tripId: trip.clientId,
        countedChicken: Number(chickens),
        countedKilo: kilo,
      });
      setResult({
        ...recountResult(expected, { chicken: Number(chickens), kilo }),
        expected,
      });
    } catch (e) {
      setErrors({
        form:
          e instanceof InvalidRecordError
            ? e.message
            : "Couldn't save the recount.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 pb-4">
      <FormHeader
        title="Recount"
        hint="Count what's left on the truck and enter what you see."
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Chickens counted" error={errors.chickens}>
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
        <Field label="Kilos weighed" error={errors.kilo}>
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
      {errors.form && (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      )}
      <button type="submit" disabled={saving} className={primaryButton}>
        {saving ? "Saving…" : "Save recount"}
      </button>
    </form>
  );
}
