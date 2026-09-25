"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      className={`${className} ${active ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      {label}
    </Link>
  );
}
