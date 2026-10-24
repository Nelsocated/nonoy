import { describe, expect, it } from "vitest";
import { TripsService } from "./trips";

describe("TripsService", () => {
  it("should be defined", () => {
    expect(
      new TripsService({} as never, {} as never, {} as never),
    ).toBeDefined();
  });
});
