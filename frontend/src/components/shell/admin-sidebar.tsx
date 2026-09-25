import { Logo } from "@/components/logo";
import type { SessionUser } from "@/lib/api/types";
import { NavLink, type NavItem } from "./nav-link";
import { UserMenu } from "./user-menu";

// add entries here as admin pages are built
const NAV: NavItem[] = [{ href: "/admin", label: "Dashboard" }];

export function AdminSidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="flex flex-col gap-6 border-b bg-surface p-4 md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
      <div className="flex items-center gap-3">
        <Logo className="size-9" />
        <span className="font-semibold tracking-tight">Nonoy</span>
      </div>
      <nav className="flex gap-1 md:flex-col">
        {NAV.map((item) => (
          <NavLink key={item.href} {...item} exact={item.href === "/admin"} className="rounded-md px-3 py-2 text-sm font-medium transition-colors" />
        ))}
      </nav>
      <div className="md:mt-auto">
        <UserMenu user={user} />
      </div>
    </aside>
  );
}
