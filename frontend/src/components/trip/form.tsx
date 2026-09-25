"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useId } from "react";

export const inputClass =
  "w-full rounded-md border border-input bg-surface px-3 py-3 text-lg tabular-nums outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100 aria-invalid:border-danger";

export const primaryButton =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-lg font-medium text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover active:bg-primary-active disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100";

// Screen title with a back link to the trip.
export function FormHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <Link
        href="/field"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="size-4" /> Trip
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Label + control + error/hint underneath, wired with aria-describedby.
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: React.ReactNode;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  }) => React.ReactNode;
}) {
  const id = useId();
  const note = `${id}-note`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": !!error,
        "aria-describedby": error || hint ? note : undefined,
      })}
      {error ? (
        <p id={note} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={note} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
