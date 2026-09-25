import { getSession } from "@/lib/auth/session";

export default async function FieldHome() {
  const session = await getSession();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Hi, {session?.user.name}</h1>
      <div className="rounded-xl bg-surface p-5 text-sm text-muted-foreground shadow-card">
        Your trips, sales and expenses will appear here.
      </div>
    </div>
  );
}
