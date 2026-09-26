import { ChevronDown, CircleHelp } from "lucide-react";
import Link from "next/link";
import { INFO_LINKS } from "./info-links";

// "Help & info" in the admin menu: one row that opens to About, Help,
// Privacy and Terms. A native <details>, so it works with keyboard and
// screen readers without extra code.
export function InfoMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary-soft-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100 [&::-webkit-details-marker]:hidden">
        <CircleHelp aria-hidden className="size-5 shrink-0" />
        <span className="flex-1">Help &amp; info</span>
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <ul className="mt-1 ml-5 space-y-0.5 border-l border-brand-100 pl-3">
        {INFO_LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              className="flex min-h-11 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary-soft-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
