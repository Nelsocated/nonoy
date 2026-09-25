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
  engine: { syncOnce(): Promise<SyncOutcome> };
  schedule?: Schedule;
}) {
  let phase: SyncPhase = "idle";
  let running: Promise<void> | null = null;
  let again = false;
  let cancelRetry = () => {};
  const listeners = new Set<() => void>();

  const set = (p: SyncPhase) => {
    phase = p;
    listeners.forEach((l) => l());
  };

  async function pass() {
    set("syncing");
    const run = () => engine.syncOnce();
    const outcome: SyncOutcome =
      typeof navigator !== "undefined" && navigator.locks
        ? await navigator.locks.request(LOCK, run)
        : await run();
    cancelRetry();
    if (outcome.kind === "offline") {
      set("offline");
      cancelRetry = schedule(() => void requestSync(), outcome.retryInMs);
    } else {
      set(outcome.kind === "paused" ? "paused" : "idle");
    }
  }

  function requestSync(): Promise<void> {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      try {
        do {
          again = false;
          await pass();
        } while (again && phase !== "paused");
      } finally {
        running = null;
      }
    })();
    return running;
  }

  function start() {
    const kick = () => void requestSync();
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
