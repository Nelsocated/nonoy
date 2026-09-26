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

export type UserFormMode = "add" | "edit" | "password";
export type UserFormValues = {
  name: string;
  phone: string;
  password: string;
  confirm: string;
};

// bcrypt (on the server) only uses the first 72 bytes of a password
const PASSWORD_BYTES = 72;

// Checks the users dialog before it talks to the server; field → message.
// `currentPhone` is the edited user's phone: an unchanged one isn't checked,
// so someone saved without a phone can still get their name fixed.
export function userFormErrors(
  mode: UserFormMode,
  values: UserFormValues,
  currentPhone: string | null = null,
): Record<string, string> {
  const err: Record<string, string> = {};
  if (mode === "add" || mode === "edit") {
    if (!values.name.trim()) err.name = "Enter a name.";
    const phone = values.phone.trim();
    const changed = mode === "add" || phone !== (currentPhone ?? "");
    if (changed && phone.length < 11)
      err.phone = "Enter the 11-digit phone number.";
  }
  if (mode === "add" || mode === "password") {
    if (values.password.length < 6) err.password = "Use at least 6 characters.";
    else if (new TextEncoder().encode(values.password).length > PASSWORD_BYTES)
      err.password = "Use a shorter password (72 characters at most).";
    if (mode === "password" && values.confirm !== values.password)
      err.confirm = "Passwords don't match.";
  }
  return err;
}
