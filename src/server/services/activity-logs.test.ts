import { describe, expect, it } from "vitest";
import { ActivityLogsService } from "./activity-logs";

describe("ActivityLogsService", () => {
  it("should be defined", () => {
    expect(new ActivityLogsService({} as never)).toBeDefined();
  });
});
