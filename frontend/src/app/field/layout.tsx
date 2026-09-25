import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { OfflineProvider } from "@/components/offline/offline-provider";
import { FieldNav } from "@/components/shell/field-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { getSession } from "@/lib/auth/session";

export default async function FieldLayout({ children }: LayoutProps<"/field">) {
  const session = await getSession();
  if (!session) redirect("/login"); // proxy normally handles this
  return (
    <OfflineProvider userId={session.user.id}>
      <div className="flex flex-1 flex-col pb-16">
        <header className="flex items-center gap-3 border-b bg-surface px-4 py-3">
          <Logo className="size-8" />
          <div className="flex-1">
            <UserMenu user={session.user} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
          {children}
        </main>
        <FieldNav />
      </div>
    </OfflineProvider>
  );
}
