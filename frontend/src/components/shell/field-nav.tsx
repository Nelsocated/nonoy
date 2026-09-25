import { NavLink, type NavItem } from "./nav-link";

// add entries here as field pages are built
const NAV: NavItem[] = [{ href: "/field", label: "Home" }];

export function FieldNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t bg-surface pb-[env(safe-area-inset-bottom)]">
      {NAV.map((item) => (
        <NavLink
          key={item.href}
          {...item}
          exact={item.href === "/field"}
          className="flex-1 py-3 text-center text-sm font-medium transition-colors"
        />
      ))}
    </nav>
  );
}
