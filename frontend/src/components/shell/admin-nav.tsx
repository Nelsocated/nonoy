"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  Store,
  Tag,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { navActive, navIdle } from "@/lib/ui/styles";

// add entries here as admin pages are built
const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/price", label: "Price", icon: Tag },
  { href: "/admin/qr-codes", label: "QR codes", icon: QrCode },
  { href: "/admin/buyers", label: "Buyers", icon: Store },
  { href: "/admin/plantations", label: "Plantations", icon: Warehouse },
  { href: "/admin/users", label: "Users", icon: Users },
  // the worker trip screens, for when the owner goes out with the staff
  { href: "/field", label: "Field", icon: Truck },
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
              active ? navActive : navIdle
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
