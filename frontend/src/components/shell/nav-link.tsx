"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navActive, navIdle } from "@/lib/ui/styles";

export type NavItem = { href: string; label: string };

// exact match for an area's home, prefix match for everything under it
export function NavLink({
  href,
  label,
  exact,
  className = "",
}: NavItem & { exact?: boolean; className?: string }) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? navActive : navIdle}`}
    >
      {label}
    </Link>
  );
}
