"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleAlert,
  CircleCheck,
  CloudOff,
  ImageUp,
  Plus,
  Trash,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useOnline } from "@/components/offline/use-sync-data";
import { QrImage } from "@/components/qr/qr-image";
import { ApiError } from "@/lib/api";
import { api } from "@/lib/api/browser";
import type { PaymentQr } from "@/lib/api/types";
import { asOf } from "@/lib/offline/admin-cache";
import {
  MAX_QR_CODES,
  MAX_QR_TEXT,
  qrTextOk,
  readQrFromFile,
} from "@/lib/qr/qr";
import { showDialog } from "@/lib/ui/dialog";

const input =
  "w-full rounded-md border border-input bg-surface px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100 aria-invalid:border-danger";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:opacity-50";
const primary = `${button} bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover active:bg-primary-active disabled:shadow-none`;
const quiet = `${button} text-muted-foreground hover:bg-muted`;
const dialog =
  "m-auto w-[min(26rem,calc(100%-2rem))] rounded-xl bg-surface p-6 text-foreground shadow-card backdrop:bg-ink-950/50";

const NOT_FOUND =
  "Couldn't find a QR code in this image — try a clearer screenshot.";
const TOO_LONG = "This QR holds too much text to save.";
const MISREAD =
  "This QR didn't read correctly — try a clearer, uncropped screenshot.";

const message = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : fallback;

// Owner/admin: the payment QR codes workers show buyers (GCash, Maya, bank…).
// Only the text inside each QR is saved; phones redraw it offline.
export function QrCodesScreen() {
  const queryClient = useQueryClient();
  const online = useOnline();
  const ids = useId();
  const list = useQuery({
    queryKey: ["paymentQrs"],
    queryFn: () => api.paymentQrs.list(),
  });

  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  // a success note fades after a few seconds; a problem stays until the next action
  useEffect(() => {
    if (!status?.ok) return;
    const t = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(t);
  }, [status]);
  const [editing, setEditing] = useState<PaymentQr | "new" | null>(null);
  const [label, setLabel] = useState("");
  const [payload, setPayload] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const form = useRef<HTMLDialogElement>(null);
  const confirm = useRef<HTMLDialogElement>(null);
  // bumped each time the form opens: a slow image read from an earlier
  // opening must not fill in the new one
  const opening = useRef(0);

  const codes = list.data ?? [];
  const current = editing && editing !== "new" ? editing : null;
  const full = codes.length >= MAX_QR_CODES;

  const done = (text: string) => {
    setStatus({ text, ok: true });
    void queryClient.invalidateQueries({ queryKey: ["paymentQrs"] });
  };
  // removed by someone else meanwhile: close up and show the fresh list
  const gone = (e: unknown) => {
    if (!(e instanceof ApiError && e.status === 404)) return false;
    confirm.current?.close();
    form.current?.close();
    setStatus({ text: "That QR code was already removed.", ok: false });
    void queryClient.invalidateQueries({ queryKey: ["paymentQrs"] });
    return true;
  };

  const save = useMutation({
    mutationFn: (body: { label: string; payload: string }) =>
      current
        ? api.paymentQrs.update(current.id, body)
        : api.paymentQrs.create(body),
    onSuccess: () => {
      form.current?.close();
      done("Saved.");
    },
    onError: (e) => {
      if (!gone(e))
        setErrors({ form: message(e, "Couldn't save the QR code.") });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.paymentQrs.remove(id),
    onSuccess: () => {
      confirm.current?.close();
      form.current?.close();
      done("QR code removed.");
    },
    onError: (e) => {
      if (gone(e)) return;
      confirm.current?.close();
      setErrors({ form: message(e, "Couldn't remove the QR code.") });
    },
  });

  function open(item: PaymentQr | "new") {
    opening.current += 1;
    setReading(false);
    setStatus(null);
    setEditing(item);
    setLabel(item === "new" ? "" : item.label);
    setPayload(item === "new" ? null : item.payload);
    setErrors({});
    showDialog(form.current);
  }

  const imageError = (text: string | null) =>
    setErrors((x) => {
      const next = { ...x };
      if (text) next.image = text;
      else delete next.image;
      return next;
    });

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // picking the same file again still fires
    if (!file) return;
    const mine = opening.current;
    setReading(true);
    imageError(null);
    try {
      const text = await readQrFromFile(file);
      if (mine !== opening.current) return;
      if (!text) imageError(NOT_FOUND);
      else if (text.length > MAX_QR_TEXT) imageError(TOO_LONG);
      else if (!qrTextOk(text)) imageError(MISREAD);
      else setPayload(text);
    } catch {
      // not an image the browser can open
      if (mine === opening.current) imageError(NOT_FOUND);
    } finally {
      if (mine === opening.current) setReading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!label.trim()) err.label = "Enter a label.";
    if (!payload) err.image = "Choose an image with a QR code.";
    setErrors(err);
    if (Object.keys(err).length || !payload) return;
    save.mutate({ label: label.trim(), payload });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">QR codes</h1>
          <p className="text-sm text-muted-foreground">
            Payment QR codes workers show buyers who pay by QR — GCash, Maya,
            bank. Up to {MAX_QR_CODES}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => open("new")}
          disabled={!online || full}
          className={`${primary} w-full sm:w-auto`}
        >
          <Plus aria-hidden className="size-5" /> Add QR code
        </button>
      </div>

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

      {!online && (
        <p className="flex items-center gap-2 text-sm text-warning">
          <CloudOff aria-hidden className="size-4" /> Saving needs signal.
          {list.dataUpdatedAt > 0 && ` ${asOf(list.dataUpdatedAt)}`}
        </p>
      )}
      {full && (
        <p className="text-sm text-muted-foreground">
          You have {MAX_QR_CODES} QR codes. Remove one to add another.
        </p>
      )}

      <section className="overflow-hidden rounded-xl border bg-surface shadow-card">
        <h2 className="flex items-center justify-between border-b bg-muted/60 px-5 py-2.5 text-sm font-medium">
          QR codes
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
            {codes.length}
          </span>
        </h2>
        {list.isPending ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Loading…</p>
        ) : list.isError && !list.data ? (
          // not "No QR codes yet": the owner might add duplicates
          <div className="space-y-3 px-5 py-6 text-center">
            <p className="text-sm text-danger">
              Couldn&apos;t load the QR codes.
            </p>
            <button
              type="button"
              onClick={() => void list.refetch()}
              disabled={!online || list.isFetching}
              className={`${quiet} border border-input`}
            >
              {list.isFetching ? "Trying…" : "Try again"}
            </button>
          </div>
        ) : codes.length ? (
          <ul className="divide-y divide-border">
            {codes.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => open(c)}
                  disabled={!online}
                  className="flex min-h-20 w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-primary-soft/50 focus-visible:bg-primary-soft/50 focus-visible:outline-none disabled:hover:bg-transparent"
                >
                  <QrImage
                    payload={c.payload}
                    label={c.label}
                    className="size-14 shrink-0 rounded-sm border border-border"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {c.label}
                  </span>
                  <span className="text-sm text-muted-foreground">Edit</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">
            No QR codes yet. Add the QR buyers scan to pay you.
          </p>
        )}
      </section>

      <dialog
        ref={form}
        aria-labelledby={`${ids}-title`}
        onClose={() => setEditing(null)}
        className={dialog}
      >
        <form onSubmit={submit} noValidate className="space-y-4">
          <h2 id={`${ids}-title`} className="text-lg font-semibold">
            {current ? `Edit ${current.label}` : "Add QR code"}
          </h2>

          <div className="space-y-1.5">
            <label htmlFor={`${ids}-label`} className="text-sm font-medium">
              Label
            </label>
            <input
              id={`${ids}-label`}
              value={label}
              maxLength={40}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="GCash"
              autoComplete="off"
              aria-invalid={!!errors.label}
              aria-describedby={errors.label ? `${ids}-label-error` : undefined}
              className={input}
            />
            {errors.label && (
              <p id={`${ids}-label-error`} className="text-sm text-danger">
                {errors.label}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">QR code</span>
            {payload && (
              <QrImage
                payload={payload}
                label={label || "New"}
                className="mx-auto w-44 rounded-sm border border-border"
              />
            )}
            <label
              className={`${quiet} w-full cursor-pointer border border-input has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand-100`}
            >
              <ImageUp aria-hidden className="size-5" />
              {reading
                ? "Reading…"
                : payload
                  ? "Choose a different image"
                  : "Choose image"}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void pick(e)}
                aria-describedby={`${ids}-image-help`}
                className="sr-only"
              />
            </label>
            <p
              id={`${ids}-image-help`}
              className={`text-sm ${errors.image ? "text-danger" : "text-muted-foreground"}`}
            >
              {errors.image ??
                "A screenshot of your GCash, Maya or bank QR. Only the code inside is saved."}
            </p>
          </div>

          {errors.form && (
            <p role="alert" className="text-sm text-danger">
              {errors.form}
            </p>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={save.isPending || reading}
              className={primary}
            >
              {save.isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => form.current?.close()}
              className={quiet}
            >
              Cancel
            </button>
            {current && (
              <button
                type="button"
                onClick={() => showDialog(confirm.current)}
                className={`${button} text-danger hover:bg-danger-soft`}
              >
                <Trash aria-hidden className="size-5" /> Remove
              </button>
            )}
          </div>
        </form>
      </dialog>

      <dialog
        ref={confirm}
        aria-labelledby={`${ids}-remove`}
        className={dialog}
      >
        <h2 id={`${ids}-remove`} className="text-lg font-semibold">
          Remove {current?.label}?
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          Workers&apos; phones stop showing it after their next sync. Past sales
          aren&apos;t affected.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => current && remove.mutate(current.id)}
            disabled={remove.isPending}
            className={`${button} bg-danger text-primary-foreground hover:opacity-90`}
          >
            {remove.isPending ? "Removing…" : "Remove"}
          </button>
          {/* focus the safe choice */}
          <button
            type="button"
            data-autofocus
            onClick={() => confirm.current?.close()}
            className={quiet}
          >
            Cancel
          </button>
        </div>
      </dialog>
    </div>
  );
}
