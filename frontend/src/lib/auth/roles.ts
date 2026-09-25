import type { Role, SessionUser } from "@/lib/api/types";

const HOME: Record<Role, string> = {
  OWNER: "/admin",
  ADMIN: "/admin",
  WORKER: "/field",
};
const AREAS: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["OWNER", "ADMIN"] },
  { prefix: "/field", roles: ["WORKER"] },
];
const PUBLIC = ["/login", "/theme"];

const within = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const homeFor = (role: Role) => HOME[role];
export const isPublic = (pathname: string) =>
  PUBLIC.some((p) => within(pathname, p));

// paths outside a role area are open to any signed-in user
export function canAccess(role: Role, pathname: string) {
  const area = AREAS.find((a) => within(pathname, a.prefix));
  return !area || area.roles.includes(role);
}

export type GuardResult =
  { action: "next" } | { action: "redirect"; to: string } | { action: "clear" };

// Optimistic page guard for proxy.ts — the backend's RolesGuard is the real authority.
export function guard({
  pathname,
  user,
  expired,
}: {
  pathname: string;
  user: SessionUser | null;
  expired: boolean;
}): GuardResult {
  if (pathname === "/login" && user) {
    // ?expired=1 means the backend rejected the session: drop it rather than bounce back (loop)
    return expired
      ? { action: "clear" }
      : { action: "redirect", to: homeFor(user.role) };
  }
  if (isPublic(pathname)) return { action: "next" };
  if (!user) return { action: "redirect", to: "/login" };
  if (pathname === "/" || !canAccess(user.role, pathname))
    return { action: "redirect", to: homeFor(user.role) };
  return { action: "next" };
}
