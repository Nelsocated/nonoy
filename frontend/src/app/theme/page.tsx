// Living style guide for the theme tokens in globals.css — visit /theme.

import { Logo } from "@/components/logo";

const brand = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const ink = brand;

const semantic = [
  ["primary", "bg-primary", "text-primary-foreground"],
  ["primary-soft", "bg-primary-soft", "text-primary-soft-foreground"],
  ["surface", "bg-surface border", "text-surface-foreground"],
  ["background", "bg-background border", "text-foreground"],
  ["muted", "bg-muted", "text-muted-foreground"],
  ["success-soft", "bg-success-soft", "text-success"],
  ["warning-soft", "bg-warning-soft", "text-warning"],
  ["danger-soft", "bg-danger-soft", "text-danger"],
];

export default function ThemePage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10 sm:px-8">
      <header className="space-y-1">
        <Logo className="mb-4" />
        <h1 className="text-3xl font-semibold tracking-tight">Theme</h1>
        <p className="text-muted-foreground">Minimal red &amp; white. Tokens live in globals.css.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Brand red</h2>
        <div className="grid grid-cols-11 overflow-hidden rounded-lg">
          {brand.map((s) => (
            <div key={s} className="h-14" style={{ background: `var(--color-brand-${s})` }} title={`brand-${s}`} />
          ))}
        </div>
        <h2 className="text-sm font-medium text-muted-foreground">Warm neutrals</h2>
        <div className="grid grid-cols-11 overflow-hidden rounded-lg border">
          {ink.map((s) => (
            <div key={s} className="h-14" style={{ background: `var(--color-ink-${s})` }} title={`ink-${s}`} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {semantic.map(([name, bg, fg]) => (
          <div key={name} className={`${bg} ${fg} rounded-lg p-4 text-sm font-medium`}>
            {name}
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* buttons + badges */}
        <section className="space-y-5 rounded-xl bg-surface p-6 shadow-card">
          <h2 className="font-semibold">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover active:bg-primary-active">
              Start trip
            </button>
            <button className="rounded-md border border-input bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted">
              Record expense
            </button>
            <button className="rounded-md bg-primary-soft px-4 py-2.5 text-sm font-medium text-primary-soft-foreground transition-colors hover:bg-brand-100">
              Recount
            </button>
            <button className="rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Cancel
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-success">Synced</span>
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-warning">Offline · 3 pending</span>
            <span className="rounded-full bg-danger-soft px-2.5 py-1 text-danger">⚠ Conflict</span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">Ended</span>
            <span className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground">QR</span>
          </div>
        </section>

        {/* form */}
        <section className="space-y-4 rounded-xl bg-surface p-6 shadow-card">
          <h2 className="font-semibold">Record a sale</h2>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Buyer</span>
            <input
              className="w-full rounded-md border border-input bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100"
              placeholder="Walk-in customer"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Chickens</span>
              <input inputMode="numeric" defaultValue="30" className="w-full rounded-md border border-input bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Kilos</span>
              <input inputMode="decimal" defaultValue="60.25" className="w-full rounded-md border border-danger bg-surface px-3 py-2.5 text-sm outline-none ring-3 ring-danger-soft" />
              <span className="text-xs text-danger">⚠ Max 2 decimals</span>
            </label>
          </div>
          <div className="flex rounded-md bg-muted p-1 text-sm font-medium">
            <button className="flex-1 rounded-sm bg-surface py-1.5 shadow-card">Cash</button>
            <button className="flex-1 rounded-sm py-1.5 text-muted-foreground">QR</button>
          </div>
        </section>
      </div>

      {/* stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-primary p-5 text-primary-foreground shadow-primary">
          <p className="text-sm opacity-80">Sales today</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">₱12,000.00</p>
          <p className="mt-2 text-xs opacity-80">₱9,000 cash · ₱3,000 QR</p>
        </div>
        <div className="rounded-xl bg-surface p-5 shadow-card">
          <p className="text-sm text-muted-foreground">On the truck</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">60</p>
          <p className="mt-2 text-xs text-muted-foreground">120.25 kg remaining</p>
        </div>
        <div className="rounded-xl bg-surface p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Expenses</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">₱650.00</p>
          <p className="mt-2 text-xs text-success">Net ₱11,350.00</p>
        </div>
      </section>

      {/* table */}
      <section className="overflow-hidden rounded-xl bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Worker</th>
              <th className="px-4 py-3 text-right font-medium">Trips</th>
              <th className="px-4 py-3 text-right font-medium">Sales</th>
              <th className="px-4 py-3 text-right font-medium">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr className="bg-primary-soft/60">
              <td className="px-4 py-3 font-medium">Juan Dela Cruz</td>
              <td className="px-4 py-3 text-right">3</td>
              <td className="px-4 py-3 text-right">₱36,450.00</td>
              <td className="px-4 py-3 text-right text-danger">1</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium">Maria Santos</td>
              <td className="px-4 py-3 text-right">2</td>
              <td className="px-4 py-3 text-right">₱21,900.00</td>
              <td className="px-4 py-3 text-right text-muted-foreground">0</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
