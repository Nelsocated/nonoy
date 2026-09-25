"use client";

import Link from "next/link";
import {
  ChevronRight,
  CircleCheck,
  CloudOff,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { summarize, type StatusTone } from "@/lib/offline/status";
import { useOffline } from "./offline-provider";
import { useOnline, useSyncData } from "./use-sync-data";

export const TONE: Record<
  StatusTone,
  { box: string; icon: typeof CircleCheck; spin?: boolean }
> = {
  ok: { box: "bg-success-soft text-success", icon: CircleCheck },
  busy: { box: "bg-muted text-foreground", icon: RefreshCw, spin: true },
  offline: { box: "bg-warning-soft text-warning", icon: CloudOff },
  attention: { box: "bg-danger-soft text-danger", icon: TriangleAlert },
};

// Full-width status strip under the field header. Colour + icon + words, so it
// reads in sunlight and without relying on colour; taps through to /field/sync.
export function SyncBar() {
  const { userId, phase } = useOffline();
  const online = useOnline();
  const { pending, errors, conflicts } = useSyncData(userId);
  const { tone, label } = summarize({
    phase,
    pending,
    errors,
    conflicts: conflicts.length,
    online,
  });
  const { box, icon: Icon, spin } = TONE[tone];
  const busy = phase === "syncing";

  return (
    <Link
      href="/field/sync"
      className={`flex min-h-11 items-center gap-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-brand-100 ${box}`}
    >
      <Icon
        aria-hidden
        className={`size-5 shrink-0 ${spin && busy ? "motion-safe:animate-spin" : ""}`}
      />
      <span role="status" aria-atomic="true" className="flex-1">
        {label}
        <span className="sr-only">. Open sync details.</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 opacity-70" />
    </Link>
  );
}
