"use client";

import { LayoutDashboard, X } from "lucide-react";
import { useRef } from "react";
import { Logo } from "@/components/logo";
import type { SessionUser } from "@/lib/api/types";
import { AdminNav } from "./admin-nav";
import { UserMenu } from "./user-menu";

// Phones: a slim bar with the logo and one menu button; the navigation and
// the account (name, log out) live in a panel that slides in from the right.
export function AdminMobileBar({ user }: { user: SessionUser }) {
  const panel = useRef<HTMLDialogElement>(null);
  const close = () => panel.current?.close();

  return (
    <header className="flex items-center gap-3 border-b bg-surface px-4 py-2 md:hidden">
      <Logo className="size-9" />
      <span className="flex-1 font-semibold tracking-tight">Mang Frito</span>
      <button
        type="button"
        onClick={() => panel.current?.showModal()}
        aria-label="Open menu"
        aria-haspopup="dialog"
        className="flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
      >
        <LayoutDashboard aria-hidden className="size-6" />
      </button>

      <dialog
        ref={panel}
        aria-label="Menu"
        // tapping the dimmed area outside the panel closes it
        onClick={(e) => e.target === panel.current && close()}
        className="ml-auto mr-0 h-dvh max-h-dvh w-[min(18rem,85vw)] bg-surface p-0 text-foreground shadow-card backdrop:bg-ink-950/50"
      >
        <div className="flex h-full flex-col gap-6 p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold tracking-tight">Menu</span>
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="flex size-11 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <AdminNav onNavigate={close} />
          <div className="mt-auto border-t pt-4">
            <UserMenu user={user} />
          </div>
        </div>
      </dialog>
    </header>
  );
}
