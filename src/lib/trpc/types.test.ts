import { describe, expectTypeOf, it } from "vitest";
import type { RouterOutputs } from "./types";

// Checked by `tsc`: the wire carries Prisma Decimals and Dates as strings,
// and the screens' types must say so too.
describe("router output types", () => {
  it("Decimal infers as string", () => {
    type Price = NonNullable<RouterOutputs["prices"]["current"]>;
    expectTypeOf<Price["pricePerKilo"]>().toEqualTypeOf<string>();
  });

  it("Date infers as string", () => {
    type Price = NonNullable<RouterOutputs["prices"]["current"]>;
    expectTypeOf<Price["createdAt"]>().toEqualTypeOf<string>();
  });
});
