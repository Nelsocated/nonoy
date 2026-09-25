import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/shell/admin-sidebar";
import { getSession } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();
  if (!session) redirect("/login"); // proxy normally handles this
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AdminSidebar user={session.user} />
      <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
