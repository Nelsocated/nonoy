import { describe, expect, it } from "vitest";
import type { User } from "@/lib/api/types";
import { groupByRole } from "./users";

const u = (name: string, role: User["role"]): User => ({
  id: name,
  name,
  phone: null,
  role,
  isActive: true,
  createdAt: "",
});

describe("groupByRole", () => {
  it("workers first, then owners, then admins; empty groups dropped; names sorted", () => {
    const g = groupByRole([
      u("Zed", "WORKER"),
      u("Ana", "ADMIN"),
      u("Ben", "WORKER"),
    ]);
    expect(g.map((x) => x.label)).toEqual(["Workers", "Admins"]);
    expect(g[0].users.map((x) => x.name)).toEqual(["Ben", "Zed"]);
  });
});
