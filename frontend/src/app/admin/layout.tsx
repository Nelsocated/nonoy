import { redirect } from "next/navigation";
import { AdminQueryProvider } from "@/components/offline/admin-query-provider";
import { AdminSidebar } from "@/components/shell/admin-sidebar";
import { getSession } from "@/lib/auth/session";
import { topStrip } from "@/lib/ui/styles";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();
  if (!session) redirect("/login"); // proxy normally handles this
  return (
    <AdminQueryProvider>
      <div
        aria-hidden
        className={`${topStrip} sticky top-0 z-10 print:hidden`}
      />
      <div className="flex flex-1 flex-col md:flex-row">
        <AdminSidebar user={session.user} />
        <main className="flex-1 px-4 py-8 sm:px-8 print:p-0">{children}</main>
      </div>
    </AdminQueryProvider>
  );
}
