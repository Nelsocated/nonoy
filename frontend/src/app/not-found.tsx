import Link from "next/link";
import { SearchX } from "lucide-react";
import { Logo } from "@/components/logo";

// Any unknown address. "/" sends each person to their own home (or to login).
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        <Logo className="mx-auto size-24" />
        <div className="space-y-3 rounded-xl bg-surface p-6 shadow-card">
          <SearchX aria-hidden className="mx-auto size-10 text-primary" />
          <p className="text-sm font-medium text-muted-foreground">404</p>
          <h1 className="text-xl font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            This page doesn&apos;t exist or was moved. Check the address, or go
            back to your home screen.
          </p>
        </div>
        <Link
          href="/"
          className="flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
        >
          Go to my home
        </Link>
      </div>
    </main>
  );
}
