import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  approveBuyerRequestSchema,
  createBuyerRequestSchema,
  mergeBuyerRequestSchema,
} from "./buyer-requests";
import { createBuyerSchema, updateBuyerSchema } from "./buyers";
import { createPaymentQrSchema, updatePaymentQrSchema } from "./payment-qrs";
import { createPlantationSchema, updatePlantationSchema } from "./plantations";
import {
  adminCreateUserSchema,
  resetPasswordSchema,
  updateUserSchema,
} from "./users";

const bad = (schema: z.ZodType, body: unknown) =>
  !schema.safeParse(body).success;
const failing = (schema: z.ZodType, body: unknown) =>
  schema.safeParse(body).error?.issues.map((i) => String(i.path[0])) ?? [];

describe("reference data names", () => {
  it.each(["", "   "])("rejects blank name %j", (name) => {
    expect(bad(createBuyerSchema, { name })).toBe(true);
    expect(bad(createPlantationSchema, { name })).toBe(true);
  });
  it("accepts a real name", () => {
    expect(bad(createBuyerSchema, { name: "Aling Nena" })).toBe(false);
    expect(bad(createPlantationSchema, { name: "Farm A" })).toBe(false);
  });
  it("PATCH: name may be left out but not set to null", () => {
    for (const s of [
      updateBuyerSchema,
      updatePlantationSchema,
      updateUserSchema,
    ]) {
      expect(bad(s, {})).toBe(false);
      expect(bad(s, { name: null })).toBe(true);
      expect(bad(s, { name: "  " })).toBe(true);
    }
    expect(bad(updateUserSchema, { phone: null })).toBe(true);
    expect(bad(updateBuyerSchema, { location: null })).toBe(false);
  });
  it("says 'Enter a name'", () => {
    expect(
      createBuyerSchema.safeParse({ name: " " }).error?.issues[0].message,
    ).toBe("Enter a name");
  });
  it("rejects unknown fields with the old message", () => {
    expect(
      createBuyerSchema.safeParse({ name: "A", extra: 1 }).error?.issues[0]
        .message,
    ).toBe("property extra should not exist");
  });
});

describe("passwords", () => {
  const ok = (password: string) =>
    resetPasswordSchema.safeParse({ password }).success;
  it("allows up to 72 bytes", () => {
    expect(ok("x".repeat(72))).toBe(true);
    expect(ok("x".repeat(73))).toBe(false);
    expect(ok("ñ".repeat(37))).toBe(false); // 74 bytes in UTF-8
  });
  it("applies to new accounts too", () => {
    expect(
      failing(adminCreateUserSchema, {
        name: "Juan",
        phone: "09000000009",
        role: "WORKER",
        password: "x".repeat(73),
      }),
    ).toEqual(["password"]);
  });
});

describe("payment QR input", () => {
  it("accepts a label and the QR text, trimming the label", () => {
    const r = createPaymentQrSchema.safeParse({
      label: "  GCash ",
      payload: "000201010211",
    });
    expect(r.success).toBe(true);
    expect(r.data?.label).toBe("GCash");
  });
  it.each(["", "   "])("rejects blank label %j", (label) => {
    expect(failing(createPaymentQrSchema, { label, payload: "x" })).toContain(
      "label",
    );
  });
  it("rejects a label over 40 and a payload over 1000 characters", () => {
    expect(
      failing(createPaymentQrSchema, { label: "a".repeat(41), payload: "x" }),
    ).toContain("label");
    expect(
      failing(createPaymentQrSchema, {
        label: "GCash",
        payload: "x".repeat(1001),
      }),
    ).toContain("payload");
  });
  it("rejects an empty payload", () => {
    expect(
      failing(createPaymentQrSchema, { label: "GCash", payload: "" }),
    ).toContain("payload");
  });
  it("update may change just one field", () => {
    expect(failing(updatePaymentQrSchema, { label: "Maya" })).toEqual([]);
  });
});

const ID = "3f9a2c7e-1b2d-4c5e-8f90-123456789abc";
const good = {
  id: ID,
  name: "  Aling Nena ",
  location: " Jaro ",
  createdAtClient: "2026-09-26T06:41:00.000Z",
};

describe("buyer requests", () => {
  it("trims name and place", () => {
    const r = createBuyerRequestSchema.safeParse(good);
    expect(r.data).toMatchObject({ name: "Aling Nena", location: "Jaro" });
  });
  it("blank place becomes null", () => {
    const r = createBuyerRequestSchema.safeParse({ ...good, location: "   " });
    expect(r.success).toBe(true);
    expect(r.data?.location).toBeNull();
  });
  it.each([
    ["blank name", { name: "  " }],
    ["name over 100", { name: "x".repeat(101) }],
    ["place over 100", { location: "x".repeat(101) }],
    ["bad id", { id: "nope" }],
    ["bad date", { createdAtClient: "yesterday" }],
  ])("rejects %s", (_, over) => {
    expect(bad(createBuyerRequestSchema, { ...good, ...over })).toBe(true);
  });
  it("approve needs a name, place optional", () => {
    expect(bad(approveBuyerRequestSchema, { name: "Nena" })).toBe(false);
    expect(bad(approveBuyerRequestSchema, { name: " " })).toBe(true);
  });
  it("merge needs a buyer id", () => {
    expect(bad(mergeBuyerRequestSchema, { buyerId: ID })).toBe(false);
    expect(bad(mergeBuyerRequestSchema, { buyerId: "x" })).toBe(true);
  });
});
