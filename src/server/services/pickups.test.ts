import { describe, expect, it } from "vitest";
import { PickupsService } from "./pickups";

describe("PickupsService", () => {
  it("should be defined", () => {
    expect(
      new PickupsService({} as never, {} as never, {} as never),
    ).toBeDefined();
  });
});
