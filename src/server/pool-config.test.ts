import { describe, expect, it } from "vitest";
import { poolConfig } from "./pool-config";

describe("poolConfig", () => {
  it("keeps 3 connections per instance", () => {
    expect(poolConfig("postgres://x").max).toBe(3);
  });

  // an unreachable database fails a request in seconds instead of hanging
  // until the operating system's TCP timeout
  it("gives up connecting after 10 seconds", () => {
    expect(poolConfig("postgres://x").connectionTimeoutMillis).toBe(10_000);
  });

  it("uses the given connection string", () => {
    expect(poolConfig("postgres://db").connectionString).toBe("postgres://db");
  });
});
