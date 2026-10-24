import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../generated/prisma/enums";
import { testClient } from "../test-client";
import { appRouter } from "./_app";

const ME = "00000000-0000-4000-8000-000000000001";
const U2 = "00000000-0000-4000-8000-000000000002";

const users = {
  create: vi.fn(async (_dto: object, role: Role = Role.WORKER) => ({
    id: "new",
    role,
  })),
  list: vi.fn(async () => []),
  getProfile: vi.fn(),
  setActive: vi.fn(async (id: string, isActive: boolean) => ({ id, isActive })),
  update: vi.fn(async (id: string, dto: object) => ({ id, ...dto })),
  resetPassword: vi.fn(async (id: string) => ({ id })),
};
const as = (role: Role) =>
  testClient(appRouter, {
    user: { id: ME, role },
    services: { users } as never,
  }).users;

const dto = (role: Role) => ({
  phone: "09170000009",
  password: "secret1",
  name: "X",
  role,
});

async function failure(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error("expected a failure");
}

beforeEach(() => vi.clearAllMocks());

describe("users router", () => {
  it.each([
    [Role.ADMIN, Role.ADMIN],
    [Role.ADMIN, Role.OWNER],
    [Role.ADMIN, Role.WORKER],
    [Role.OWNER, Role.WORKER],
    [Role.OWNER, Role.OWNER],
  ])("%s can create %s", async (me, target) => {
    await expect(as(me).create.mutate(dto(target))).resolves.toEqual({
      id: "new",
      role: target,
    });
    // role is passed separately, not inside the dto
    expect(users.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ role: expect.anything() }),
      target,
    );
  });

  it("an owner cannot create admin accounts", async () => {
    const e = await failure(as(Role.OWNER).create.mutate(dto(Role.ADMIN)));
    expect(e).toMatchObject({
      status: 403,
      message: "OWNER cannot create ADMIN accounts",
    });
    expect(users.create).not.toHaveBeenCalled();
  });

  it("a worker cannot create accounts at all", async () => {
    expect(
      await failure(as(Role.WORKER).create.mutate(dto(Role.WORKER))),
    ).toMatchObject({ status: 403 });
  });

  it("ADMIN lists every role, OWNER all but admins", async () => {
    await as(Role.ADMIN).list.query();
    expect(users.list).toHaveBeenLastCalledWith([
      Role.ADMIN,
      Role.OWNER,
      Role.WORKER,
    ]);
    await as(Role.OWNER).list.query();
    expect(users.list).toHaveBeenLastCalledWith([Role.OWNER, Role.WORKER]);
  });

  it("me returns the signed-in user's profile, for any role", async () => {
    users.getProfile.mockResolvedValue({ id: ME });
    await as(Role.WORKER).me.query();
    expect(users.getProfile).toHaveBeenCalledWith(ME);
  });

  it("OWNER gets 'not found' for anything on an admin account", async () => {
    users.getProfile.mockResolvedValue({ id: U2, role: Role.ADMIN });
    const owner = as(Role.OWNER);
    for (const p of [
      owner.setActive.mutate({ id: U2, isActive: false }),
      owner.update.mutate({ id: U2, name: "X" }),
      owner.resetPassword.mutate({ id: U2, password: "newpass" }),
    ])
      expect(await failure(p)).toMatchObject({
        status: 404,
        message: "User not found",
      });
    expect(users.setActive).not.toHaveBeenCalled();
    expect(users.update).not.toHaveBeenCalled();
    expect(users.resetPassword).not.toHaveBeenCalled();
  });

  it.each([
    [Role.ADMIN, Role.OWNER],
    [Role.ADMIN, Role.ADMIN],
    [Role.OWNER, Role.WORKER],
    [Role.OWNER, Role.OWNER],
  ])("%s can deactivate %s", async (me, target) => {
    users.getProfile.mockResolvedValue({ id: U2, role: target });
    await expect(
      as(me).setActive.mutate({ id: U2, isActive: false }),
    ).resolves.toEqual({ id: U2, isActive: false });
  });

  it("edits another user and your own name/phone", async () => {
    users.getProfile.mockResolvedValue({ id: U2, role: Role.WORKER });
    await as(Role.OWNER).update.mutate({ id: U2, name: "New" });
    expect(users.update).toHaveBeenCalledWith(U2, { name: "New" });
    users.getProfile.mockResolvedValue({ id: ME, role: Role.OWNER });
    await as(Role.OWNER).update.mutate({ id: ME, phone: "09171234567" });
    expect(users.update).toHaveBeenLastCalledWith(ME, {
      phone: "09171234567",
    });
  });

  it("resets another user's password but never your own", async () => {
    users.getProfile.mockResolvedValue({ id: U2, role: Role.WORKER });
    await as(Role.OWNER).resetPassword.mutate({ id: U2, password: "newpass" });
    expect(users.resetPassword).toHaveBeenCalledWith(U2, "newpass");
    expect(
      await failure(
        as(Role.ADMIN).resetPassword.mutate({ id: ME, password: "newpass" }),
      ),
    ).toMatchObject({
      status: 403,
      message: "You cannot reset your own password here",
    });
  });

  it("nobody can deactivate themselves", async () => {
    expect(
      await failure(
        as(Role.ADMIN).setActive.mutate({ id: ME, isActive: false }),
      ),
    ).toMatchObject({
      status: 403,
      message: "You cannot change your own active status",
    });
    expect(users.setActive).not.toHaveBeenCalled();
  });

  it("rejects a malformed id like the old ParseUUIDPipe", async () => {
    expect(
      await failure(as(Role.OWNER).update.mutate({ id: "nope", name: "X" })),
    ).toMatchObject({
      status: 400,
      message: "Validation failed (uuid is expected)",
    });
  });
});
