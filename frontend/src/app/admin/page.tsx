import { Dashboard } from "@/components/admin/dashboard";
import { getSession } from "@/lib/auth/session";

export default async function AdminHome() {
  const session = await getSession();
  return <Dashboard name={session?.user.name ?? ""} />;
}
