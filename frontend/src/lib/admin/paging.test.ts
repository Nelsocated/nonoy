import { describe, expect, it } from "vitest";
import { PAGE_SIZE, pageOf } from "./paging";

const n = (k: number) => Array.from({ length: k }, (_, i) => i);

describe("pageOf", () => {
  it("cuts 15 per page", () => {
    expect(PAGE_SIZE).toBe(15);
    const p = pageOf(n(40), 2);
    expect(p).toMatchObject({ page: 2, pages: 3 });
    expect(p.rows).toEqual(n(40).slice(15, 30));
  });
  it("clamps out-of-range pages and treats empty as one page", () => {
    expect(pageOf(n(40), 9).page).toBe(3);
    expect(pageOf(n(40), 0).page).toBe(1);
    expect(pageOf([], 1)).toEqual({ rows: [], page: 1, pages: 1 });
  });
});
