import { describe, expect, it } from "vitest";
import { matchesSearch, removedMessage } from "./search";

describe("matchesSearch", () => {
  it("matches any field, ignoring case and extra spaces", () => {
    expect(matchesSearch(["Aling Nena", "Tarlac"], "  nena ")).toBe(true);
    expect(matchesSearch(["Farm A", null], "tarlac")).toBe(false);
    expect(matchesSearch(["Farm A"], "")).toBe(true);
  });
});

describe("removedMessage", () => {
  it("says what the server did", () => {
    expect(removedMessage({ result: "deleted", uses: 0 }, "sale")).toBe(
      "Deleted.",
    );
    expect(removedMessage({ result: "archived", uses: 1 }, "sale")).toBe(
      "Archived — it has 1 sale, so it's kept for history.",
    );
    expect(removedMessage({ result: "archived", uses: 12 }, "pickup")).toBe(
      "Archived — it has 12 pickups, so it's kept for history.",
    );
    expect(removedMessage({ result: "archived", uses: 0 }, "sale")).toBe(
      "Archived — a recent new buyer request uses it. It can be deleted 60 days after that request was checked.",
    );
  });
});
