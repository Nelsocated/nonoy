"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOffline } from "@/components/offline/offline-provider";
import {
  Field,
  FormHeader,
  inputClass,
  primaryButton,
} from "@/components/trip/form";
import { useTrip } from "@/components/trip/use-trip";
import { getDb } from "@/lib/offline/db";
import { InvalidRecordError } from "@/lib/offline/validate";
import { digits, typedAmount } from "@/lib/trip/input";
import { toCenti } from "@/lib/trip/money";
import { FormSkeleton } from "@/components/skeleton";
import { Select } from "@/components/select";

const TWO_DP = /^\d{1,8}(\.\d{1,2})?$/;

export default function PickupPage() {
  const { userId, writer } = useOffline();
  const data = useTrip(userId);
  const lastKey = `lastPlantationId:${userId}`;
  // the plantation used last time — most pickups are from the same farm
  const last = useLiveQuery(
    async () => ((await getDb().meta.get(lastKey))?.value as string) ?? "",
    [lastKey],
  );
  const router = useRouter();

  const [plantationId, setPlantationId] = useState<string | null>(null);
  const [chickens, setChickens] = useState("");
  const [kilo, setKilo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !data.trip) router.replace("/field");
  }, [data, router]);

  if (!data?.trip || last === undefined) return <FormSkeleton />;
  const trip = data.trip;

  const plantations = [...data.plantations].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  const chosen =
    plantationId ??
    (data.plantations.has(last) ? last : (plantations[0]?.[0] ?? ""));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!chosen) err.plantation = "Pick the plantation.";
    if (!/^[1-9]\d*$/.test(chickens))
      err.chickens = "Enter how many chickens (at least 1).";
    if (!TWO_DP.test(kilo) || toCenti(kilo) === 0)
      err.kilo = "Enter the weight in kg, up to 2 decimals.";
    setErrors(err);
    if (Object.keys(err).length) return;

    setSaving(true);
    try {
      await writer.recordPickup({
        tripId: trip.clientId,
        plantationId: chosen,
        chickenCount: Number(chickens),
        totalKilo: kilo,
      });
      await getDb().meta.put({ key: lastKey, value: chosen });
      router.replace(
        `/field?saved=${encodeURIComponent(`Pickup saved · ${chickens} chickens · ${kilo} kg`)}`,
      );
    } catch (e) {
      setErrors({
        form:
          e instanceof InvalidRecordError
            ? e.message
            : "Couldn't save the pickup.",
      });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 pb-4">
      <FormHeader title="Pickup" hint="Chickens loaded from a plantation." />

      {plantations.length === 0 ? (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
          No plantations on this phone yet. Ask the owner to add them, then sync
          with signal.
        </p>
      ) : (
        <Field label="Plantation" error={errors.plantation}>
          {(a) => (
            <Select
              {...a}
              size="lg"
              value={chosen}
              onChange={setPlantationId}
              options={plantations.map(([id, name]) => ({
                value: id,
                label: name,
              }))}
            />
          )}
        </Field>
      )}

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

      {errors.form && (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      )}
      <button
        type="submit"
        disabled={saving || plantations.length === 0}
        className={primaryButton}
      >
        {saving ? "Saving…" : "Save pickup"}
      </button>
    </form>
  );
}
