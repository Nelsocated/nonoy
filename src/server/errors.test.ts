import { describe, expect, it } from "vitest";
import { z } from "zod";
import { obj, str } from "./schemas/common";
import { zodMessage } from "./errors";

const batch = obj({
  name: str("name"),
  sales: z.array(obj({ amount: str("amount") })).optional(),
});
const message = (body: unknown) => zodMessage(batch.safeParse(body).error!);

// the old ValidationPipe named where a nested problem was, e.g. "sales.0."
describe("zodMessage", () => {
  it("leaves top-level messages as they are", () => {
    expect(message({ name: 1 })).toBe("name must be a string");
  });

  it("prefixes a nested field with where it sits", () => {
    expect(
      message({ name: "a", sales: [{ amount: "1" }, { amount: 2 }] }),
    ).toBe("sales.1.amount must be a string");
  });

  it("prefixes an unknown nested key with the object it was found in", () => {
    expect(message({ name: "a", sales: [{ amount: "1", extra: true }] })).toBe(
      "sales.0.property extra should not exist",
    );
  });
});
