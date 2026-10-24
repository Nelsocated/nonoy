import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/roles";

// Landing page comes later; for now "/" just routes by role.
export default async function Home() {
  const session = await getSession();
  redirect(session ? homeFor(session.user.role) : "/login");
}
