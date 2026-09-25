import { getSession } from "@/lib/auth/session";

export default async function AdminHome() {
  const session = await getSession();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome, {session?.user.name}</h1>
      <div className="rounded-xl bg-surface p-6 text-sm text-muted-foreground shadow-card">
        Reports and daily totals will appear here.
      </div>
    </div>
  );
}
