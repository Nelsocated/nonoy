"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Tag,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

// add entries here as admin pages are built
const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/price", label: "Price", icon: Tag },
  { href: "/admin/buyers", label: "Buyers", icon: Store },
  { href: "/admin/plantations", label: "Plantations", icon: Warehouse },
];

// Shared by the desktop sidebar and the phone menu.
export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        // the area's home matches exactly; other pages also match sub-pages
        const active =
          href === "/admin"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 ${
              active
                ? "bg-primary-soft text-primary-soft-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon aria-hidden className="size-5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
