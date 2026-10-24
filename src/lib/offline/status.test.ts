import { describe, expect, it } from "vitest";
import { summarize } from "./status";

const base = {
  phase: "idle" as const,
  pending: 0,
  errors: 0,
  conflicts: 0,
  online: true,
};

describe("summarize", () => {
  it("all clear", () =>
    expect(summarize(base)).toEqual({ tone: "ok", label: "Synced" }));
  it("syncing", () =>
    expect(summarize({ ...base, phase: "syncing", pending: 2 })).toEqual({
      tone: "busy",
      label: "Syncing…",
    }));
  it("offline with a queue", () =>
    expect(summarize({ ...base, online: false, pending: 3 })).toEqual({
      tone: "offline",
      label: "Offline · 3 pending",
    }));
  it("offline with nothing queued", () =>
    expect(summarize({ ...base, phase: "offline" })).toEqual({
      tone: "offline",
      label: "Offline",
    }));
  it("errors and conflicts need attention first", () =>
    expect(summarize({ ...base, pending: 1, errors: 1, conflicts: 1 })).toEqual(
      { tone: "attention", label: "2 need attention" },
    ));
  it("session ended", () =>
    expect(summarize({ ...base, phase: "paused", pending: 1 })).toEqual({
      tone: "attention",
      label: "Log in to sync",
    }));
  it("waiting online", () =>
    expect(summarize({ ...base, pending: 1 })).toEqual({
      tone: "busy",
      label: "1 pending",
    }));
});
