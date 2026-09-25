import type { SessionUser } from "@/lib/api/types";
import { LogoutButton } from "./logout-button";

const ROLE_LABEL = {
  OWNER: "Owner",
  ADMIN: "Admin",
  WORKER: "Worker",
} as const;

export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
      </div>
      <LogoutButton userId={user.id} />
    </div>
  );
}
