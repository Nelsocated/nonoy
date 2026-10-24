import Link from "next/link";
import { CloudOff } from "lucide-react";
import { Logo } from "@/components/logo";

// Shown by the service worker when a page that was never opened before is
// requested with no signal. Precached, so it must not depend on the session.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        <Logo className="mx-auto size-24" />
        <div className="space-y-3 rounded-xl bg-surface p-6 shadow-card">
          <CloudOff aria-hidden className="mx-auto size-10 text-warning" />
          <h1 className="text-xl font-semibold tracking-tight">
            You&apos;re offline
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Pages you&apos;ve opened before still work. Anything you record is
            saved on this phone and syncs when you&apos;re back online.
          </p>
        </div>
        <Link
          href="/field"
          className="flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
        >
          Go to my trips
        </Link>
      </div>
    </main>
  );
}
