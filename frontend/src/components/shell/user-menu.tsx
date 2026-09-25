import { logout } from "@/app/(auth)/login/actions";
import type { SessionUser } from "@/lib/api/types";

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
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
