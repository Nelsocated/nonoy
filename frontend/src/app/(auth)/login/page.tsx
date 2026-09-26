import { Radio, ReceiptText, WifiOff } from "lucide-react";
import { InfoLinks } from "@/components/info/info-links";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

const FEATURES = [
  {
    icon: WifiOff,
    title: "Works with no signal",
    text: "Saves on the phone, syncs later",
  },
  {
    icon: ReceiptText,
    title: "A receipt for every sale",
    text: "Cash or QR, shown on screen",
  },
  {
    icon: Radio,
    title: "The owner sees it live",
    text: "Totals, trips and problems",
  },
];

const red = "bg-linear-160 from-brand-600 to-brand-800 text-primary-foreground";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { expired } = await searchParams;
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      {/* tablets and up: the business and the app, beside the form */}
      <section
        aria-label="About Mang Frito"
        className={`${red} hidden flex-col gap-8 p-10 md:flex md:w-[46%] lg:p-14`}
      >
        <Logo className="size-20 ring-4 ring-white/30" />
        <div className="space-y-2">
          <p className="text-4xl font-bold tracking-tight">Mang Frito</p>
          <p className="text-base text-white/85">
            Live chicken trading · Iloilo City
          </p>
        </div>
        <p className="max-w-sm text-xl leading-snug font-semibold">
          Trips, sales and receipts — on the road, even with no signal.
        </p>
        <ul className="space-y-5">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Icon aria-hidden className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="block text-sm text-white/80">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-1 flex-col">
        {/* phones: red curved header; the form card overlaps it */}
        <header
          className={`${red} flex flex-col items-center gap-2 rounded-b-[2.5rem] px-6 pt-10 pb-20 text-center md:hidden`}
        >
          <Logo className="size-20 ring-4 ring-white/30" />
          <p className="mt-2 text-2xl font-bold tracking-tight">Welcome back</p>
          <p className="text-sm text-white/85">Sign in to start your trip</p>
        </header>

        <div className="-mt-14 flex flex-1 flex-col items-center px-4 pb-8 md:mt-0 md:justify-center md:px-10">
          <div className="w-full max-w-sm space-y-5">
            <div className="hidden space-y-2 md:block">
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                Use the phone number your manager registered.
              </p>
            </div>
            {/* phones: the visible title is in the red header */}
            <h1 className="sr-only md:hidden">Sign in to Mang Frito</h1>
            {expired !== undefined && (
              <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
                Your session ended. Please sign in again.
              </p>
            )}
            <LoginForm />
            <InfoLinks />
          </div>
        </div>
      </div>
    </div>
  );
}
