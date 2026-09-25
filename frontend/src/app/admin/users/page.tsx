import { redirect } from "next/navigation";
import { UsersScreen } from "@/components/admin/users-screen";
import { getSession } from "@/lib/auth/session";

// server part only reads who's logged in, so their own row can't be
// deactivated or have its password reset from here
export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <UsersScreen meId={session.user.id} />;
}
