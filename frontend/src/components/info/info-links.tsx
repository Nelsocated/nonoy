import Link from "next/link";

export const INFO_LINKS = [
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

// About · Help · Privacy · Terms — under the login form, in the admin menu,
// and at the foot of each info page.
export function InfoLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="About this app" className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-x-1 text-sm">
        {INFO_LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-flex min-h-11 items-center rounded-md px-2.5 font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
