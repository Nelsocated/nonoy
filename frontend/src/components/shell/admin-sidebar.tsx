import { Logo } from "@/components/logo";
import type { SessionUser } from "@/lib/api/types";
import { AdminMobileBar } from "./admin-mobile-bar";
import { AdminNav } from "./admin-nav";
import { UserMenu } from "./user-menu";

export function AdminSidebar({ user }: { user: SessionUser }) {
  return (
    <>
      {/* phones: slim bar + menu panel */}
      <AdminMobileBar user={user} />

      {/* tablets/desktop: full sidebar */}
      <aside className="hidden flex-col gap-6 border-r bg-surface p-4 md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0">
        <div className="flex items-center gap-3">
          <Logo className="size-9" />
          <span className="font-semibold tracking-tight">Mang Frito</span>
        </div>
        <AdminNav />
        <div className="mt-auto">
          <UserMenu user={user} />
        </div>
      </aside>
    </>
  );
}
