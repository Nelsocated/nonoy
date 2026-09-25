import { describe, expect, it } from "vitest";
import { decimal, digits } from "./input";

describe("typing filters", () => {
  it("digits keeps whole numbers only", () => {
    expect(digits("1a2.5")).toBe("125");
    expect(digits("12345678")).toBe("123456");
  });
  it("decimal keeps one dot and at most 2 decimals", () => {
    expect(decimal("12.345")).toBe("12.34");
    expect(decimal("1.2.3")).toBe("1.23");
    expect(decimal("₱180")).toBe("180");
    expect(decimal("0.")).toBe("0.");
  });
});
