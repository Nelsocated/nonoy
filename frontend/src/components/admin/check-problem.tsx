"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useOnline } from "@/components/offline/use-sync-data";
import { ApiError } from "@/lib/api";
import { api } from "@/lib/api/browser";
import type { ProblemKind } from "@/lib/api/types";
import { showDialog } from "@/lib/ui/dialog";

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:opacity-50";
const NOTE_MAX = 200;

// "Checked" on a problem: optional note, then it leaves the dashboard list.
export function CheckProblem({
  kind,
  id,
  onDone,
}: {
  kind: ProblemKind;
  id: string;
  onDone?: () => void;
}) {
  const queryClient = useQueryClient();
  const online = useOnline();
  const ids = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const check = useMutation({
    mutationFn: () => api.reports.check(kind, id, note.trim() || undefined),
    onSuccess: () => {
      dialog.current?.close();
      void queryClient.invalidateQueries({ queryKey: ["problems"] });
      void queryClient.invalidateQueries({ queryKey: ["trip"] });
      // the trips list shows a "to check" count per trip
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      onDone?.();
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Couldn't save."),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNote("");
          setError(null);
          showDialog(dialog.current);
        }}
        disabled={!online}
        className={`${button} min-h-9 border border-input bg-surface px-3 text-sm hover:bg-muted`}
      >
        <Check aria-hidden className="size-4" /> Checked
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`${ids}-title`}
        className="m-auto w-[min(24rem,calc(100%-2rem))] rounded-xl bg-surface p-6 text-foreground shadow-card backdrop:bg-ink-950/50"
      >
        <h2 id={`${ids}-title`} className="text-lg font-semibold">
          Mark as checked?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          It leaves the problems list. Add a note if it helps later.
        </p>
        <label
          htmlFor={`${ids}-note`}
          className="mt-4 block text-sm font-medium"
        >
          Note{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id={`${ids}-note`}
          rows={3}
          maxLength={NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-describedby={`${ids}-count`}
          className="mt-1.5 w-full rounded-md border border-input bg-surface px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100"
        />
        <p
          id={`${ids}-count`}
          className="mt-1 text-right text-xs text-muted-foreground tabular-nums"
        >
          {note.length}/{NOTE_MAX}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => check.mutate()}
            disabled={check.isPending}
            className={`${button} bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover`}
          >
            {check.isPending ? "Saving…" : "Mark checked"}
          </button>
          {/* the safe choice gets focus */}
          <button
            type="button"
            data-autofocus
            onClick={() => dialog.current?.close()}
            className={`${button} text-muted-foreground hover:bg-muted`}
          >
            Cancel
          </button>
        </div>
      </dialog>
    </>
  );
}
