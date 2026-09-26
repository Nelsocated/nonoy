import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/logo";
import { OfflineProvider } from "@/components/offline/offline-provider";
import { SyncBar } from "@/components/offline/sync-bar";
import { FieldNav } from "@/components/shell/field-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { getSession } from "@/lib/auth/session";
import { topStrip } from "@/lib/ui/styles";

export default async function FieldLayout({ children }: LayoutProps<"/field">) {
  const session = await getSession();
  if (!session) redirect("/login"); // proxy normally handles this
  // owner/admin out with the staff: same screens, but they may see the stock
  const staff = session.user.role !== "WORKER";
  return (
    <OfflineProvider
      userId={session.user.id}
      userName={session.user.name}
      seesStock={staff}
    >
      <div className="flex flex-1 flex-col pb-16">
        <div aria-hidden className={`${topStrip} sticky top-0 z-10`} />
        {/* stays on screen while scrolling (sticky under the red strip) */}
        <header className="sticky top-1 z-10 flex items-center gap-3 border-b bg-surface/95 px-4 py-3 backdrop-blur-sm">
          <Logo className="size-8" />
          <div className="flex-1">
            <UserMenu user={session.user} />
          </div>
          {staff && (
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
            >
              <LayoutDashboard aria-hidden className="size-5" /> Admin
            </Link>
          )}
        </header>
        <SyncBar />
        <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
          {children}
        </main>
        <FieldNav />
      </div>
    </OfflineProvider>
  );
}
