import type { SyncPhase } from "./runtime";

type Input = {
  phase: SyncPhase;
  pending: number;
  errors: number;
  conflicts: number;
  online: boolean;
};
export type StatusTone = "ok" | "busy" | "offline" | "attention";

export function summarize({
  phase,
  pending,
  errors,
  conflicts,
  online,
}: Input): { tone: StatusTone; label: string } {
  if (phase === "paused") return { tone: "attention", label: "Log in to sync" };
  const attention = errors + conflicts;
  if (attention)
    return { tone: "attention", label: `${attention} need attention` };
  if (!online || phase === "offline")
    return {
      tone: "offline",
      label: pending ? `Offline · ${pending} pending` : "Offline",
    };
  if (phase === "syncing") return { tone: "busy", label: "Syncing…" };
  if (pending) return { tone: "busy", label: `${pending} pending` };
  return { tone: "ok", label: "Synced" };
}
