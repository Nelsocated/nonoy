"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudOff, Tag } from "lucide-react";
import { useRef, useState } from "react";
import { Pager } from "@/components/admin/pager";
import { useOnline } from "@/components/offline/use-sync-data";
import { ApiError } from "@/lib/api";
import { api } from "@/lib/api/browser";
import { pagedList, pageOf } from "@/lib/admin/paging";
import { asOf } from "@/lib/offline/admin-cache";
import { typedAmount } from "@/lib/trip/input";
import { peso } from "@/lib/trip/money";
import { amount, InvalidRecordError } from "@/lib/offline/validate";
import { showDialog } from "@/lib/ui/dialog";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const input =
  "w-full rounded-md border border-input bg-surface px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100 aria-invalid:border-danger";
const button =
  "min-h-11 rounded-md px-4 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100";

// Owner's price per kilo: workers' phones pick it up on their next sync and
// use it (editable, flagged) for every sale.
export default function PricePage() {
  const queryClient = useQueryClient();
  const online = useOnline();
  const current = useQuery({
    queryKey: ["prices", "current"],
    queryFn: () => api.prices.current(),
  });
  const history = useQuery({
    queryKey: ["prices", "history"],
    queryFn: () => api.prices.history(),
  });

  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const confirm = useRef<HTMLDialogElement>(null);

  const setPrice = useMutation({
    mutationFn: (pricePerKilo: string) => api.prices.set(pricePerKilo),
    onSuccess: () => {
      setValue("");
      void queryClient.invalidateQueries({ queryKey: ["prices"] });
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Couldn't save the price."),
  });

  function review(e: React.FormEvent) {
    e.preventDefault();
    try {
      amount(value, "Price");
      if (Number(value) <= 0)
        throw new InvalidRecordError("Price must be more than 0.");
      setError(null);
      showDialog(confirm.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check the price.");
    }
  }

  const price = current.data;
  const shown = pageOf(history.data ?? [], page);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Price</h1>
        <p className="text-sm text-muted-foreground">
          Workers&apos; phones use this price per kilo for every sale. They can
          change it on a sale, and those sales are flagged for you.
        </p>
      </div>

      <section className="rounded-xl bg-surface p-6 shadow-card">
        <p className="text-sm text-muted-foreground">Current price</p>
        {price ? (
          <>
            <p className="mt-1 text-4xl font-semibold tabular-nums">
              {peso(price.pricePerKilo)}
              <span className="text-lg font-medium text-muted-foreground">
                {" "}
                / kg
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Set by {price.setBy.name} · {when(price.createdAt)}
            </p>
          </>
        ) : current.isPending ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <p className="mt-2 text-base">
            No price set yet — workers will have to type one on each sale.
          </p>
        )}
        {current.dataUpdatedAt > 0 && !online && (
          <p className="mt-2 text-xs text-muted-foreground">
            {asOf(current.dataUpdatedAt)}
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-xl bg-surface p-6 shadow-card">
        <h2 className="font-semibold">Set a new price</h2>
        {online ? (
          <form onSubmit={review} className="space-y-3" noValidate>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Price per kilo (₱)</span>
              <input
                inputMode="decimal"
                autoComplete="off"
                value={value}
                onChange={(e) => setValue(typedAmount(e.target.value))}
                placeholder={price?.pricePerKilo ?? "180.00"}
                aria-invalid={!!error}
                aria-describedby={error ? "price-error" : undefined}
                className={input}
              />
            </label>
            {error && (
              <p id="price-error" role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={setPrice.isPending || !value}
              className={`${button} w-full bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none`}
            >
              {setPrice.isPending ? "Saving…" : "Review new price"}
            </button>
          </form>
        ) : (
          <p className="flex items-center gap-2 text-sm text-warning">
            <CloudOff aria-hidden className="size-4" /> Changing the price needs
            signal.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border bg-surface shadow-card">
        <h2 className="flex items-center justify-between border-b bg-muted/60 px-5 py-2.5 text-sm font-medium">
          History
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
            {history.data?.length ?? 0}
          </span>
        </h2>
        {history.data?.length ? (
          <>
            <ul className={pagedList(shown.pages)}>
              {shown.rows.map((p, i) => (
                <li
                  key={p.id}
                  className="flex h-16 items-center justify-between gap-3 px-5"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">
                      {peso(p.pricePerKilo)}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        / kg
                      </span>
                    </span>
                    {shown.page === 1 && i === 0 && (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                        Current
                      </span>
                    )}
                  </span>
                  <span className="text-right text-sm text-muted-foreground">
                    {p.setBy.name}
                    <span className="block text-xs">{when(p.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Pager
              page={shown.page}
              pages={shown.pages}
              onPage={setPage}
              label="price history"
            />
          </>
        ) : (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">
            No price changes yet.
          </p>
        )}
      </section>

      <dialog
        ref={confirm}
        aria-labelledby="confirm-price"
        className="m-auto w-[min(22rem,calc(100%-2rem))] rounded-xl bg-surface p-6 text-foreground shadow-card backdrop:bg-ink-950/50"
      >
        <Tag aria-hidden className="size-8 text-primary" />
        <h2 id="confirm-price" className="mt-3 text-lg font-semibold">
          {/* rendered on every keystroke (dialog is only hidden) — format valid input only */}
          Set price to{" "}
          {/^\d{1,8}(\.\d{1,2})?$/.test(value.trim()) ? peso(value) : ""} per
          kg?
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          Phones switch to it on their next sync. Sales already recorded keep
          their price.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              confirm.current?.close();
              setPrice.mutate(value.trim());
            }}
            className={`${button} bg-primary text-primary-foreground hover:bg-primary-hover`}
          >
            Set price
          </button>
          {/* focus the safe choice: Enter shouldn't change every worker's price */}
          <button
            type="button"
            data-autofocus
            onClick={() => confirm.current?.close()}
            className={`${button} text-muted-foreground hover:bg-muted`}
          >
            Cancel
          </button>
        </div>
      </dialog>
    </div>
  );
}
