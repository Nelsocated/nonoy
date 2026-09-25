"use client";

import { useActionState, useState } from "react";
import { login } from "./actions";

const input =
  "w-full rounded-md border border-input bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const [phone, setPhone] = useState("");

  return (
    <form
      action={action}
      className="space-y-4 rounded-xl bg-surface p-6 shadow-card"
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Phone number</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="username"
          required
          // controlled: React 19 resets uncontrolled fields after a form action,
          // which would wipe the number on a wrong-password retry
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09XX XXX XXXX"
          className={input}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={input}
        />
      </label>
      {state?.error && (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover active:bg-primary-active disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
