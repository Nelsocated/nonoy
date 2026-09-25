import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { expired } = await searchParams;
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-3">
        <Logo />
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">Use the phone number your manager registered.</p>
      </div>
      {expired !== undefined && (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">Your session ended. Please sign in again.</p>
      )}
      <LoginForm />
    </div>
  );
}
