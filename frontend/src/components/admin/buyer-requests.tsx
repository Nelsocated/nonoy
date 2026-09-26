"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useOnline } from "@/components/offline/use-sync-data";
import { ApiError } from "@/lib/api";
import { api } from "@/lib/api/browser";
import type { PendingBuyerRequest } from "@/lib/api/types";
import { askedLine, decidedNote, salesCount } from "@/lib/admin/buyer-requests";
import { pagedList, pageOf } from "@/lib/admin/paging";
import { showDialog } from "@/lib/ui/dialog";
import { cardCount, cardTitle } from "@/lib/ui/styles";
import { Pager } from "./pager";

const input =
  "w-full rounded-md border border-input bg-surface px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100 aria-invalid:border-danger";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:opacity-50";
const primary = `${button} bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover active:bg-primary-active disabled:shadow-none`;
const quiet = `${button} text-muted-foreground hover:bg-muted`;
const small =
  "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:opacity-50";
const dialog =
  "m-auto w-[min(26rem,calc(100%-2rem))] rounded-xl bg-surface p-6 text-foreground shadow-card backdrop:bg-ink-950/50";

type Kind = "approve" | "merge" | "reject";

// New buyers workers typed on sales, waiting for the owner/admin: approve
// (maybe fixing the name), say it's an existing buyer, or reject. Hidden when
// nothing is waiting.
export function BuyerRequestsCard() {
  const queryClient = useQueryClient();
  const online = useOnline();
  const ids = useId();
  const requests = useQuery({
    queryKey: ["buyer-requests"],
    queryFn: () => api.buyerRequests.pending(),
  });
  // same query as the buyer list below, so no second fetch
  const buyers = useQuery({
    queryKey: ["buyers", "all"],
    queryFn: () => api.buyers.list({ archived: true }),
  });
  const active = (buyers.data ?? [])
    .filter((b) => !b.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name));

  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<{
    kind: Kind;
    r: PendingBuyerRequest;
  } | null>(null);
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const box = useRef<HTMLDialogElement>(null);

  // a note after a decision fades after 6 s, like the other admin screens
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(t);
  }, [status]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["buyer-requests"] });
    void queryClient.invalidateQueries({ queryKey: ["buyers"] });
  };

  const decide = useMutation({
    mutationFn: async ({ kind, r }: { kind: Kind; r: PendingBuyerRequest }) => {
      if (kind === "approve")
        await api.buyerRequests.approve(r.id, {
          name: name.trim(),
          location: place.trim() || null,
        });
      else if (kind === "merge") await api.buyerRequests.merge(r.id, target);
      else await api.buyerRequests.reject(r.id);
    },
    onSuccess: (_, { kind, r }) => {
      box.current?.close();
      const into = active.find((b) => b.id === target)?.name ?? "";
      setStatus({
        text: decidedNote(
          kind,
          kind === "approve" ? name.trim() : kind === "merge" ? into : r.name,
        ),
        ok: true,
      });
      refresh();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) {
        box.current?.close();
        setStatus({ text: "Already decided.", ok: false });
        refresh();
        return;
      }
      setError(e instanceof ApiError ? e.message : "Couldn't save. Try again.");
    },
  });

  function start(kind: Kind, r: PendingBuyerRequest) {
    setOpen({ kind, r });
    setName(r.name);
    setPlace(r.location ?? "");
    setTarget("");
    setError(null);
    showDialog(box.current);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!open) return;
    if (open.kind === "approve" && !name.trim())
      return setError("Enter a name.");
    if (open.kind === "merge" && !target) return setError("Pick a buyer.");
    decide.mutate(open);
  }

  const list = requests.data ?? [];
  const shown = pageOf(list, page);
  const r = open?.r;
  const into = active.find((b) => b.id === target)?.name;

  return (
    <>
      <p role="status" className="empty:hidden">
        {status && (
          <span
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
              status.ok
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger"
            }`}
          >
            {status.ok ? (
              <CircleCheck aria-hidden className="size-5 shrink-0" />
            ) : (
              <CircleAlert aria-hidden className="size-5 shrink-0" />
            )}{" "}
            {status.text}
          </span>
        )}
      </p>

      {list.length > 0 && (
        <section className="overflow-hidden rounded-xl border bg-surface shadow-card">
          <h2 className={cardTitle}>
            New buyers to check
            <span className={cardCount}>{list.length}</span>
          </h2>
          <ul className={pagedList(shown.pages)}>
            {shown.rows.map((req) => (
              <li
                key={req.id}
                className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {req.name}
                    {req.location && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {req.location}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {askedLine(req)} · {salesCount(req.sales)}
                  </span>
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    disabled={!online}
                    onClick={() => start("approve", req)}
                    className={`${small} bg-primary text-primary-foreground hover:bg-primary-hover`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={!online}
                    onClick={() => start("merge", req)}
                    className={`${small} text-primary hover:bg-primary-soft`}
                  >
                    Same as…
                  </button>
                  <button
                    type="button"
                    disabled={!online}
                    onClick={() => start("reject", req)}
                    className={`${small} text-muted-foreground hover:bg-muted`}
                  >
                    Reject
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <Pager
            page={shown.page}
            pages={shown.pages}
            onPage={setPage}
            label="new buyers"
          />
        </section>
      )}

      <dialog ref={box} className={dialog} aria-labelledby={`${ids}-title`}>
        {r && open && (
          <form onSubmit={submit} className="space-y-4">
            <h2 id={`${ids}-title`} className="text-lg font-semibold">
              {open.kind === "approve"
                ? "Add this buyer"
                : open.kind === "merge"
                  ? `Is “${r.name}” an existing buyer?`
                  : `Reject “${r.name}”?`}
            </h2>

            {open.kind === "approve" && (
              <>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Name</span>
                  <input
                    className={input}
                    value={name}
                    maxLength={100}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Location</span>
                  <input
                    className={input}
                    value={place}
                    maxLength={100}
                    onChange={(e) => setPlace(e.target.value)}
                  />
                </label>
              </>
            )}

            {open.kind === "merge" && (
              <label className="block space-y-1">
                <span className="text-sm font-medium">Buyer</span>
                <span className="relative block">
                  <select
                    className={`${input} appearance-none pr-9`}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  >
                    <option value="">Pick a buyer</option>
                    {active.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary"
                  />
                </span>
                {into && (
                  <span className="block text-sm text-muted-foreground">
                    {r.sales === 1
                      ? "Its sale moves"
                      : `${salesCount(r.sales)} move`}{" "}
                    to {into}.
                  </span>
                )}
              </label>
            )}

            {open.kind === "reject" && (
              <p className="text-sm text-muted-foreground">
                {r.sales === 0
                  ? "It has no sales."
                  : r.sales === 1
                    ? "Its sale stays walk-in."
                    : `Its ${r.sales} sales stay walk-in.`}
              </p>
            )}

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                data-autofocus
                onClick={() => box.current?.close()}
                className={quiet}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={decide.isPending || !online}
                className={primary}
              >
                {open.kind === "approve"
                  ? "Add buyer"
                  : open.kind === "merge"
                    ? "Move sales"
                    : "Reject"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
