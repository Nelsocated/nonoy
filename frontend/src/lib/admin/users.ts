import type { Role, User } from "@/lib/api/types";

const ORDER: { role: Role; label: string }[] = [
  { role: "WORKER", label: "Workers" },
  { role: "OWNER", label: "Owners" },
  { role: "ADMIN", label: "Admins" },
];

// Users screen sections: workers first (managed most), empty roles hidden
export function groupByRole(users: User[]) {
  return ORDER.map((g) => ({
    ...g,
    users: users
      .filter((u) => u.role === g.role)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.users.length > 0);
}
