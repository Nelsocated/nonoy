"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveRestore,
  CircleAlert,
  CircleCheck,
  CloudOff,
  Plus,
  Search,
  Trash,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { useOnline } from "@/components/offline/use-sync-data";
import { ApiError } from "@/lib/api";
import type { RemoveResult } from "@/lib/api/types";
import { matchesSearch, removedMessage } from "@/lib/admin/search";
import { asOf } from "@/lib/offline/admin-cache";

export type RefField = {
  key: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
};
export type RefItem = { id: string; name: string; archivedAt: string | null };
/** optional fields left empty are sent as null so they clear on the server */
export type RefInput = Record<string, string | null>;

type Props<T extends RefItem> = {
  title: string;
  intro: string;
  singular: string;
  queryKey: string;
  fields: RefField[];
  subtitle: (item: T) => string | null;
  usesNoun: "sale" | "pickup";
  api: {
    list: (o: { archived?: boolean }) => Promise<T[]>;
    create: (input: RefInput) => Promise<unknown>;
    update: (id: string, input: RefInput) => Promise<unknown>;
    remove: (id: string) => Promise<RemoveResult>;
    restore: (id: string) => Promise<unknown>;
  };
};

const input =
  "w-full rounded-md border border-input bg-surface px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100 aria-invalid:border-danger";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:opacity-50";
const primary = `${button} bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover active:bg-primary-active disabled:shadow-none`;
const quiet = `${button} text-muted-foreground hover:bg-muted`;
const dialog =
  "m-auto w-[min(26rem,calc(100%-2rem))] rounded-xl bg-surface p-6 text-foreground shadow-card backdrop:bg-ink-950/50";

const message = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : fallback;

// Owner/admin list of reference data (buyers, plantations): search, add, edit,
// remove (the server deletes unused ones, archives ones with history) and restore.
export function ReferencePage<T extends RefItem>({
  title,
  intro,
  singular,
  queryKey,
  fields,
  subtitle,
  usesNoun,
  api,
}: Props<T>) {
  const queryClient = useQueryClient();
  const online = useOnline();
  const ids = useId();
  const list = useQuery({
    queryKey: [queryKey, "all"],
    queryFn: () => api.list({ archived: true }),
  });

  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const form = useRef<HTMLDialogElement>(null);
  const confirm = useRef<HTMLDialogElement>(null);

  const done = (text: string) => {
    setStatus({ text, ok: true });
    void queryClient.invalidateQueries({ queryKey: [queryKey] });
  };

  const save = useMutation({
    mutationFn: (input: RefInput) =>
      editing === "new" || !editing
        ? api.create(input)
        : api.update(editing.id, input),
    onSuccess: () => {
      form.current?.close();
      done("Saved.");
    },
    onError: (e) =>
      setErrors({ form: message(e, `Couldn't save the ${singular}.`) }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: (r) => {
      confirm.current?.close();
      form.current?.close();
      done(removedMessage(r, usesNoun));
    },
    onError: (e) => {
      confirm.current?.close();
      setErrors({ form: message(e, `Couldn't remove the ${singular}.`) });
    },
  });
  const restore = useMutation({
    mutationFn: (id: string) => api.restore(id),
    onSuccess: () => done("Restored."),
    onError: (e) =>
      setStatus({
        text: message(e, `Couldn't restore the ${singular}.`),
        ok: false,
      }),
  });

  function open(item: T | "new") {
    setEditing(item);
    setErrors({});
    setValues(
      Object.fromEntries(
        fields.map((f) => [
          f.key,
          item === "new"
            ? ""
            : String((item as Record<string, unknown>)[f.key] ?? ""),
        ]),
      ),
    );
    form.current?.showModal();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    for (const f of fields)
      if (f.required && !values[f.key]?.trim())
        err[f.key] = `Enter a ${f.label.toLowerCase()}.`;
    setErrors(err);
    if (Object.keys(err).length) return;
    save.mutate(
      Object.fromEntries(
        fields.map((f) => [f.key, values[f.key]?.trim() || null]),
      ),
    );
  }

  const items = (list.data ?? []).filter((i) =>
    matchesSearch([i.name, subtitle(i)], query),
  );
  const active = items.filter((i) => !i.archivedAt);
  const archived = items.filter((i) => i.archivedAt);
  const current = editing && editing !== "new" ? editing : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{intro}</p>
        </div>
        <button
          type="button"
          onClick={() => open("new")}
          disabled={!online}
          className={`${primary} w-full sm:w-auto`}
        >
          <Plus aria-hidden className="size-5" /> Add {singular}
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

      <label className="relative block">
        <span className="sr-only">Search</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}`}
          className={`${input} pl-10`}
        />
      </label>

      <section className="rounded-xl bg-surface shadow-card">
        {list.isPending ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Loading…</p>
        ) : active.length ? (
          <ul className="divide-y">
            {active.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => open(item)}
                  disabled={!online}
                  className="flex min-h-14 w-full flex-col items-start justify-center px-5 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:hover:bg-transparent"
                >
                  <span className="font-medium">{item.name}</span>
                  {subtitle(item) && (
                    <span className="text-sm text-muted-foreground">
                      {subtitle(item)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            {query
              ? `No ${singular}s match “${query.trim()}”.`
              : `No ${singular}s yet.`}
          </p>
        )}
      </section>

      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
          className="size-5 accent-primary"
        />
        Show archived ({archived.length})
      </label>

      {showArchived && archived.length > 0 && (
        <section className="rounded-xl bg-surface shadow-card">
          <ul className="divide-y">
            {archived.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-muted-foreground">
                    {item.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Archived
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => restore.mutate(item.id)}
                  disabled={!online || restore.isPending}
                  className={`${quiet} shrink-0 border border-input`}
                >
                  <ArchiveRestore aria-hidden className="size-5" /> Restore
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <dialog
        ref={form}
        aria-labelledby={`${ids}-title`}
        onClose={() => setEditing(null)}
        className={dialog}
      >
        <form onSubmit={submit} noValidate className="space-y-4">
          <h2 id={`${ids}-title`} className="text-lg font-semibold">
            {current ? `Edit ${current.name}` : `Add ${singular}`}
          </h2>
          {fields.map((f) => {
            const id = `${ids}-${f.key}`;
            const err = errors[f.key];
            const props = {
              id,
              value: values[f.key] ?? "",
              onChange: (
                e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
              ) => setValues((v) => ({ ...v, [f.key]: e.target.value })),
              "aria-invalid": !!err,
              "aria-describedby": err ? `${id}-error` : undefined,
              className: input,
            };
            return (
              <div key={f.key} className="space-y-1.5">
                <label htmlFor={id} className="text-sm font-medium">
                  {f.label}
                  {!f.required && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      (optional)
                    </span>
                  )}
                </label>
                {f.multiline ? (
                  <textarea rows={3} {...props} />
                ) : (
                  <input autoComplete="off" {...props} />
                )}
                {err && (
                  <p id={`${id}-error`} className="text-sm text-danger">
                    {err}
                  </p>
                )}
              </div>
            );
          })}
          {errors.form && (
            <p role="alert" className="text-sm text-danger">
              {errors.form}
            </p>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <button type="submit" disabled={save.isPending} className={primary}>
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
                onClick={() => confirm.current?.showModal()}
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
          Remove {current?.name}?
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          If it has {usesNoun}s it will be archived instead, so history keeps
          its name. Archived {singular}s can be restored.
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
            autoFocus
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
