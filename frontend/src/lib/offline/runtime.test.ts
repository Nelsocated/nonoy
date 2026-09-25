import { describe, expect, it, vi } from "vitest";
import { createRuntime } from "./runtime";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

describe("runtime", () => {
  it("runs one sync at a time and coalesces requests made meanwhile into one follow-up", async () => {
    const gate = deferred();
    const syncOnce = vi
      .fn()
      .mockImplementationOnce(async () => {
        await gate.promise;
        return { kind: "synced", pushed: 0, failed: 0 };
      })
      .mockResolvedValue({ kind: "synced", pushed: 0, failed: 0 });
    const rt = createRuntime({
      engine: { syncOnce },
      schedule: () => () => {},
    });
    const a = rt.requestSync();
    rt.requestSync();
    rt.requestSync();
    expect(rt.getPhase()).toBe("syncing");
    gate.resolve();
    await a;
    await vi.waitFor(() => expect(syncOnce).toHaveBeenCalledTimes(2));
    expect(rt.getPhase()).toBe("idle");
  });

  it("reports offline and schedules the retry the engine asked for", async () => {
    const schedule = vi.fn(() => () => {});
    const rt = createRuntime({
      engine: {
        syncOnce: async () => ({ kind: "offline", retryInMs: 30_000 }),
      },
      schedule,
    });
    await rt.requestSync();
    expect(rt.getPhase()).toBe("offline");
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 30_000);
  });

  it("reports paused on 401 and notifies subscribers", async () => {
    const rt = createRuntime({
      engine: { syncOnce: async () => ({ kind: "paused" }) },
      schedule: () => () => {},
    });
    const seen: string[] = [];
    rt.subscribe(() => seen.push(rt.getPhase()));
    await rt.requestSync();
    expect(seen).toEqual(["syncing", "paused"]);
  });
});
