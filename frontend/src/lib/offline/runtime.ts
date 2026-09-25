import type { SyncOutcome } from "./engine";

export type SyncPhase = "idle" | "syncing" | "offline" | "paused";

const PERIOD_MS = 30_000;
const LOCK = "mangfrito-sync";

type Schedule = (fn: () => void, ms: number) => () => void;
const defaultSchedule: Schedule = (fn, ms) => {
  const t = setTimeout(fn, ms);
  return () => clearTimeout(t);
};

// Serialises sync passes (one at a time, across tabs via Web Locks when available),
// coalesces requests that arrive mid-pass, and exposes the phase to React.
export function createRuntime({
  engine,
  schedule = defaultSchedule,
}: {
  engine: { syncOnce(opts: { manual: boolean }): Promise<SyncOutcome> };
  schedule?: Schedule;
}) {
  let phase: SyncPhase = "idle";
  // set when the provider unmounts (logout, user switch): a pass still in
  // flight must not schedule retries or sync the old user's queue later
  let stopped = false;
  let running: Promise<void> | null = null;
  let again = false;
  let manualNext = false; // a "Sync now" tap waiting for the next pass
  let cancelRetry = () => {};
  const listeners = new Set<() => void>();

  const set = (p: SyncPhase) => {
    phase = p;
    listeners.forEach((l) => l());
  };

  async function pass(manual: boolean) {
    set("syncing");
    const run = () => engine.syncOnce({ manual });
    const outcome: SyncOutcome =
      typeof navigator !== "undefined" && navigator.locks
        ? await navigator.locks.request(LOCK, run)
        : await run();
    cancelRetry();
    if (stopped) return;
    if (outcome.kind === "offline") {
      set("offline");
      cancelRetry = schedule(() => void requestSync(), outcome.retryInMs);
    } else {
      set(outcome.kind === "paused" ? "paused" : "idle");
    }
  }

  function requestSync({ manual = false } = {}): Promise<void> {
    if (stopped) return Promise.resolve();
    manualNext ||= manual;
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      try {
        do {
          again = false;
          const m = manualNext;
          manualNext = false;
          await pass(m);
        } while (again && phase !== "paused");
      } finally {
        running = null;
      }
    })();
    return running;
  }

  function start() {
    stopped = false; // React dev mode runs effects twice: start, stop, start
    const kick = () => void requestSync();
    if (typeof window === "undefined") {
      kick();
      return () => {
        stopped = true;
        cancelRetry();
      };
    }
    const onVisible = () => document.visibilityState === "visible" && kick();
    window.addEventListener("online", kick);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(
      () => navigator.onLine && phase !== "paused" && kick(),
      PERIOD_MS,
    );
    kick();
    return () => {
      window.removeEventListener("online", kick);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
      stopped = true;
      cancelRetry();
    };
  }

  return {
    requestSync,
    start,
    getPhase: () => phase,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
}

export type Runtime = ReturnType<typeof createRuntime>;
