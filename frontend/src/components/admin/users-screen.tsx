"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleCheck,
  CloudOff,
  KeyRound,
  Pencil,
  Power,
  UserPlus,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { useOnline } from "@/components/offline/use-sync-data";
import { pagedList, pageOf } from "@/lib/admin/paging";
import { groupByRole, userFormErrors } from "@/lib/admin/users";
import { PasswordInput } from "@/components/password-input";
import { Pager } from "./pager";
import { ApiError } from "@/lib/api";
import { api } from "@/lib/api/browser";
import type { Role, User } from "@/lib/api/types";
import { asOf } from "@/lib/offline/admin-cache";
import { showDialog } from "@/lib/ui/dialog";

const input =
  "w-full rounded-md border border-input bg-surface px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100 aria-invalid:border-danger";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:opacity-50";
const primary = `${button} bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover active:bg-primary-active disabled:shadow-none`;
const quiet = `${button} text-muted-foreground hover:bg-muted`;
const outline = `${button} justify-start border border-input hover:bg-muted`;

type Mode = "add" | "menu" | "edit" | "password" | "active";
type Values = {
  name: string;
  phone: string;
  password: string;
  confirm: string;
  role: Role;
};
const empty: Values = {
  name: "",
  phone: "",
  password: "",
  confirm: "",
  role: "WORKER",
};

// Server messages mentioning the phone or password go under that field
const fieldFor = (msg: string) =>
  /phone/i.test(msg) ? "phone" : /password/i.test(msg) ? "password" : "form";

export function UsersScreen({ meId }: { meId: string }) {
  const queryClient = useQueryClient();
  const online = useOnline();
  const ids = useId();
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => api.users.list(),
  });

  const [status, setStatus] = useState<string | null>(null);
  // one page number per role group
  const [pages, setPages] = useState<Partial<Record<Role, number>>>({});
  const [mode, setMode] = useState<Mode>("add");
  const [target, setTarget] = useState<User | null>(null);
  const [values, setValues] = useState<Values>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(0);

  const act = useMutation({
    mutationFn: async (): Promise<string> => {
      if (mode === "add") {
        await api.users.create({
          name: values.name.trim(),
          phone: values.phone.trim(),
          password: values.password,
          role: values.role,
        });
        return "User added.";
      }
      if (!target) throw new Error("No user");
      if (mode === "edit") {
        const change: { name?: string; phone?: string } = {};
        if (values.name.trim() !== target.name)
          change.name = values.name.trim();
        if (values.phone.trim() !== (target.phone ?? ""))
          change.phone = values.phone.trim();
        if (Object.keys(change).length)
          await api.users.update(target.id, change);
        return "Saved.";
      }
      if (mode === "password") {
        await api.users.resetPassword(target.id, values.password);
        return "Password reset.";
      }
      await api.users.setActive(target.id, !target.isActive);
      return target.isActive ? "Deactivated." : "Activated.";
    },
    onSuccess: (text) => {
      dialog.current?.close();
      setStatus(text);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : "Couldn't save.";
      setErrors({ [fieldFor(msg)]: msg });
    },
  });

  function open(next: Mode, user: User | null = null) {
    setOpened((n) => n + 1); // fresh form: passwords start hidden again
    setMode(next);
    setTarget(user);
    setErrors({});
    setValues(
      user ? { ...empty, name: user.name, phone: user.phone ?? "" } : empty,
    );
    showDialog(dialog.current);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err =
      mode === "add" || mode === "edit" || mode === "password"
        ? userFormErrors(mode, values, target?.phone)
        : {};
    setErrors(err);
    if (!Object.keys(err).length) act.mutate();
  }

  const set =
    (k: keyof Values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [k]: e.target.value }));

  function field(
    k: "name" | "phone" | "password" | "confirm",
    label: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) {
    const id = `${ids}-${k}`;
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {k === "password" || k === "confirm" ? (
          <PasswordInput
            id={id}
            value={values[k]}
            onChange={set(k)}
            aria-invalid={!!errors[k]}
            aria-describedby={errors[k] ? `${id}-error` : undefined}
            className={input}
            {...extra}
          />
        ) : (
          <input
            id={id}
            value={values[k]}
            onChange={set(k)}
            aria-invalid={!!errors[k]}
            aria-describedby={errors[k] ? `${id}-error` : undefined}
            className={input}
            {...extra}
          />
        )}
        {errors[k] && (
          <p id={`${id}-error`} className="text-sm text-danger">
            {errors[k]}
          </p>
        )}
      </div>
    );
  }

  const title: Record<Mode, string> = {
    add: "Add user",
    menu: target?.name ?? "",
    edit: `Edit ${target?.name ?? ""}`,
    password: `New password for ${target?.name ?? ""}`,
    active: target?.isActive
      ? `Deactivate ${target?.name ?? ""}?`
      : `Activate ${target?.name ?? ""}?`,
  };
  const isMe = target?.id === meId;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Everyone who can log in. Workers use their phone number to sign in.
          </p>
        </div>
        <button
          type="button"
          onClick={() => open("add")}
          disabled={!online}
          className={`${primary} w-full sm:w-auto`}
        >
          <UserPlus aria-hidden className="size-5" /> Add user
        </button>
      </div>

      <p role="status" className="empty:hidden">
        {status && (
          <span className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success">
            <CircleCheck aria-hidden className="size-5 shrink-0" /> {status}
          </span>
        )}
      </p>

      {!online && (
        <p className="flex items-center gap-2 text-sm text-warning">
          <CloudOff aria-hidden className="size-4" /> Saving needs signal.
          {users.dataUpdatedAt > 0 && ` ${asOf(users.dataUpdatedAt)}`}
        </p>
      )}

      {users.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        groupByRole(users.data ?? []).map((g) => {
          const shown = pageOf(g.users, pages[g.role] ?? 1);
          return (
            <section
              key={g.role}
              className="overflow-hidden rounded-xl border bg-surface shadow-card"
            >
              <h2 className="flex items-center justify-between border-b bg-muted/60 px-5 py-2.5 text-sm font-medium">
                {g.label}
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                  {g.users.length}
                </span>
              </h2>
              <ul className={pagedList(shown.pages)}>
                {shown.rows.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => open("menu", u)}
                      disabled={!online}
                      className="flex h-16 w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:hover:bg-transparent"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {u.name}
                          {u.id === meId && (
                            <span className="font-normal text-muted-foreground">
                              {" "}
                              (you)
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {u.phone ?? "No phone"}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.isActive
                            ? "bg-success-soft text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <Pager
                page={shown.page}
                pages={shown.pages}
                onPage={(n) => setPages((p) => ({ ...p, [g.role]: n }))}
                label={g.label.toLowerCase()}
              />
            </section>
          );
        })
      )}

      <dialog
        ref={dialog}
        aria-labelledby={`${ids}-title`}
        className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-xl bg-surface p-6 text-foreground shadow-card backdrop:bg-ink-950/50"
      >
        <h2 id={`${ids}-title`} className="text-lg font-semibold">
          {title[mode]}
        </h2>

        {mode === "menu" && target ? (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => open("edit", target)}
              className={outline}
            >
              <Pencil aria-hidden className="size-5" /> Edit name or phone
            </button>
            {!isMe && (
              <>
                <button
                  type="button"
                  onClick={() => open("password", target)}
                  className={outline}
                >
                  <KeyRound aria-hidden className="size-5" /> Reset password
                </button>
                <button
                  type="button"
                  onClick={() => open("active", target)}
                  className={outline}
                >
                  <Power aria-hidden className="size-5" />{" "}
                  {target.isActive ? "Deactivate" : "Activate"}
                </button>
              </>
            )}
            <button
              type="button"
              data-autofocus
              onClick={() => dialog.current?.close()}
              className={quiet}
            >
              Close
            </button>
          </div>
        ) : (
          <form
            key={opened}
            onSubmit={submit}
            noValidate
            className="mt-4 space-y-4"
          >
            {(mode === "add" || mode === "edit") && (
              <>
                {field("name", "Name", {
                  // the dialog is already open when switching steps, so
                  // move focus into the new step ourselves
                  autoFocus: true,
                  autoComplete: "off",
                })}
                {field("phone", "Phone", {
                  inputMode: "tel",
                  autoComplete: "off",
                  placeholder: "09XXXXXXXXX",
                })}
              </>
            )}
            {mode === "add" && (
              <>
                {field("password", "Password", {
                  autoComplete: "new-password",
                })}
                <div className="space-y-1.5">
                  <label
                    htmlFor={`${ids}-role`}
                    className="text-sm font-medium"
                  >
                    Role
                  </label>
                  <select
                    id={`${ids}-role`}
                    value={values.role}
                    onChange={set("role")}
                    className={input}
                  >
                    <option value="WORKER">Worker</option>
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </>
            )}
            {mode === "password" && (
              <>
                <p className="text-sm text-muted-foreground">
                  They&apos;ll be logged out on every phone and must use the new
                  password.
                </p>
                {field("password", "New password", {
                  autoFocus: true,
                  autoComplete: "new-password",
                })}
                {field("confirm", "Type it again", {
                  autoComplete: "new-password",
                })}
              </>
            )}
            {mode === "active" && (
              <p className="text-base text-muted-foreground">
                {target?.isActive
                  ? "They'll be logged out and can't log in until activated again."
                  : "They'll be able to log in again."}
              </p>
            )}
            {errors.form && (
              <p role="alert" className="text-sm text-danger">
                {errors.form}
              </p>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={act.isPending}
                className={
                  mode === "active" && target?.isActive
                    ? `${button} bg-danger text-primary-foreground hover:opacity-90`
                    : primary
                }
              >
                {act.isPending
                  ? "Saving…"
                  : {
                      add: "Add user",
                      menu: "",
                      edit: "Save",
                      password: "Reset password",
                      active: target?.isActive ? "Deactivate" : "Activate",
                    }[mode]}
              </button>
              {/* the safe choice gets focus on the confirm-only steps */}
              <button
                type="button"
                data-autofocus={mode === "active" || undefined}
                onClick={() => dialog.current?.close()}
                className={quiet}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
