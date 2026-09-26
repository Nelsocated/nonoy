import { InfoMenu } from "@/components/info/info-menu";
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
      {/* the menu scrolls on short screens (or with Help & info open);
          the account stays pinned at the bottom */}
      <aside className="hidden flex-col border-r bg-surface md:sticky md:top-1 md:flex md:h-[calc(100dvh-0.25rem)] md:w-60 md:shrink-0 print:hidden">
        <div className="flex shrink-0 items-center gap-3 p-4 pb-2">
          <Logo className="size-9" />
          <span className="font-semibold tracking-tight">Mang Frito</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 py-2">
          <AdminNav />
          <div className="mt-auto">
            <InfoMenu />
          </div>
        </div>
        <div className="shrink-0 border-t p-4">
          <UserMenu user={user} />
        </div>
      </aside>
    </>
  );
}
