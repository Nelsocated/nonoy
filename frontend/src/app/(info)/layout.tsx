import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { InfoLinks } from "@/components/info/info-links";
import { Logo } from "@/components/logo";

// About, Help, Privacy and Terms: public, readable before signing in, and
// cached on workers' phones. "/" sends people to their home or to login.
export default function InfoLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2">
          <Logo className="size-9" />
          <span className="flex-1 font-semibold tracking-tight">
            Mang Frito
          </span>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
          >
            <ArrowLeft aria-hidden className="size-4" /> Back to the app
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t bg-surface py-2">
        <InfoLinks />
      </footer>
    </div>
  );
}
