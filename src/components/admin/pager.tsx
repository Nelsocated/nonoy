"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const button =
  "inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:pointer-events-none disabled:opacity-40";

// Previous / Page x of y / Next under a list; nothing when it fits on one page
export function Pager({
  page,
  pages,
  onPage,
  label,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
  label: string;
}) {
  if (pages <= 1) return null;
  return (
    <nav
      aria-label={`${label} pages`}
      className="flex items-center justify-between gap-2 border-t px-2 py-1.5"
    >
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        aria-label={`Previous ${label} page`}
        className={button}
      >
        <ChevronLeft aria-hidden className="size-5" /> Previous
      </button>
      <span
        aria-live="polite"
        className="text-sm text-muted-foreground tabular-nums"
      >
        Page {page} of {pages}
      </span>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        aria-label={`Next ${label} page`}
        className={button}
      >
        Next <ChevronRight aria-hidden className="size-5" />
      </button>
    </nav>
  );
}
