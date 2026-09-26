"use client";

import { CircleAlert } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { login } from "./actions";

const input =
  "w-full rounded-md border border-input bg-surface px-3 py-2.5 text-base outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100";

// expired: sent here after the session ended (a quiet note, not an error)
export function LoginForm({ expired = false }: { expired?: boolean }) {
  const [state, action, pending] = useActionState(login, undefined);
  const [phone, setPhone] = useState("");
  // new key per attempt: the password goes back to hidden after each try
  const [attempt, setAttempt] = useState(0);
  const passwordId = useId();

  return (
    <form
      action={action}
      onSubmit={() => setAttempt((a) => a + 1)}
      className="space-y-4 rounded-xl border-t-3 border-t-primary bg-surface p-6 shadow-lg"
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
      {/* not wrapped in a <label>: the show/hide button sits inside */}
      <div className="space-y-1.5">
        <label htmlFor={passwordId} className="block text-sm font-medium">
          Password
        </label>
        <PasswordInput
          key={attempt}
          id={passwordId}
          name="password"
          autoComplete="current-password"
          required
          className={input}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-md bg-primary px-4 py-2.5 text-base font-semibold text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover active:bg-primary-active disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {/* under the button so it doesn't push the fields around */}
      {state?.error ? (
        <p
          role="alert"
          className="flex items-start justify-center gap-1.5 text-center text-sm text-danger"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : (
        expired && (
          <p className="text-center text-sm text-muted-foreground">
            Your session ended. Please sign in again.
          </p>
        )
      )}
    </form>
  );
}
