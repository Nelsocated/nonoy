import { describe, expect, it } from "vitest";
import type { User } from "@/lib/api/types";
import { groupByRole, userFormErrors } from "./users";

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

describe("userFormErrors", () => {
  const v = {
    name: "Juan",
    phone: "09000000009",
    password: "secret",
    confirm: "secret",
  };
  it("accepts a complete form", () => {
    expect(userFormErrors("add", v)).toEqual({});
    expect(userFormErrors("password", v)).toEqual({});
  });
  // the server's bcrypt would silently drop everything past 72 bytes
  it("refuses passwords over 72 bytes", () => {
    const long = "ñ".repeat(37); // 37 characters, 74 bytes
    expect(
      userFormErrors("password", { ...v, password: long, confirm: long }),
    ).toEqual({ password: "Use a shorter password (72 characters at most)." });
    const max = "x".repeat(72);
    expect(userFormErrors("add", { ...v, password: max })).toEqual({});
  });
  it("lets a user without a phone keep none while their name is edited", () => {
    const noPhone = { ...v, name: "Juan D.", phone: "" };
    expect(userFormErrors("edit", noPhone, null)).toEqual({});
    // adding, or typing a new short number, is still checked
    expect(userFormErrors("add", noPhone)).toHaveProperty("phone");
    expect(
      userFormErrors("edit", { ...noPhone, phone: "0917" }, null),
    ).toHaveProperty("phone");
  });
});
