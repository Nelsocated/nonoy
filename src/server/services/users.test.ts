import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictException, NotFoundException } from "../errors";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { UsersService } from "./users";

describe("UsersService", () => {
  let service: UsersService;
  const prisma = {
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.user.update.mockResolvedValue({}); // Prisma returns a promise
    service = new UsersService(prisma as never);
  });

  it("keeps the same phone without a false conflict", async () => {
    prisma.user.findUnique.mockImplementation(async ({ where }) =>
      where.id ? { id: "u1" } : { id: "u1", phone: "09170000001" },
    );
    await service.update("u1", { phone: "09170000001", name: "A" });
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("rejects a phone another user has", async () => {
    prisma.user.findUnique.mockImplementation(async ({ where }) =>
      where.id ? { id: "u1" } : { id: "u2", phone: "09170000002" },
    );
    await expect(
      service.update("u1", { phone: "09170000002" }),
    ).rejects.toThrow(
      new ConflictException("That phone number is already used"),
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  // two edits racing for the same number: the loser gets the friendly 409
  it("turns a unique-phone race into a 409, not a 500", async () => {
    prisma.user.findUnique.mockImplementation(async ({ where }) =>
      where.id ? { id: "u1" } : null,
    );
    prisma.user.update.mockRejectedValue(
      new PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    await expect(
      service.update("u1", { phone: "09170000002" }),
    ).rejects.toThrow(
      new ConflictException("That phone number is already used"),
    );
  });

  it("404s for an unknown user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.update("x", { name: "A" })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.resetPassword("x", "secret1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("password reset hashes it and logs the user out everywhere", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1" });
    await service.resetPassword("u1", "secret1");
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(data).toMatchObject({
      refreshTokenHash: null,
      previousRefreshTokenHash: null,
      refreshRotatedAt: null,
    });
  });

  it("rotates the refresh token only if it is still the one presented", async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    expect(await service.rotateRefreshTokenHash("u1", "old", "new")).toBe(true);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", refreshTokenHash: "old" },
      data: {
        refreshTokenHash: "new",
        previousRefreshTokenHash: "old",
        refreshRotatedAt: expect.any(Date),
      },
    });
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    expect(await service.rotateRefreshTokenHash("u1", "old", "new")).toBe(
      false,
    );
  });
});
