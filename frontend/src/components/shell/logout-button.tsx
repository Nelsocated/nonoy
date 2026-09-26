"use client";

import { CloudOff, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { logout } from "@/app/(auth)/login/actions";
import { clearAdminCache } from "@/lib/offline/admin-cache";
import { getDb } from "@/lib/offline/db";
import { clearPageCaches } from "@/lib/offline/sw-caches";
import { showDialog } from "@/lib/ui/dialog";

const button =
  "min-h-11 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100";

type Ask = { kind: "unsynced"; count: number } | { kind: "offline" };

// Warns before logging out with unsynced items (they stay on the phone and sync
// at the next login), and wipes cached pages/data so the next person on a
// shared phone can't see them. Logging out needs the server, so with no signal
// it says so instead of clearing caches and leaving the user signed in.
export function LogoutButton({ userId }: { userId: string }) {
  const form = useRef<HTMLFormElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [ask, setAsk] = useState<Ask>({ kind: "offline" });
  const [leaving, setLeaving] = useState(false);

  const show = (a: Ask) => {
    setAsk(a);
    showDialog(dialog.current);
  };

  async function leave() {
    if (!navigator.onLine) return show({ kind: "offline" });
    setLeaving(true);
    await Promise.allSettled([clearAdminCache(), clearPageCaches()]);
    form.current?.requestSubmit();
  }

  async function onClick() {
    if (!navigator.onLine) return show({ kind: "offline" });
    const count = await getDb()
      .outbox.where("userId")
      .equals(userId)
      .count()
      .catch(() => 0);
    if (count === 0) return leave();
    show({ kind: "unsynced", count });
  }

  const close = () => dialog.current?.close();

  return (
    <form ref={form} action={logout}>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={leaving}
        className={`${button} text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60`}
      >
        {leaving ? "Logging out…" : "Log out"}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="logout-title"
        className="m-auto w-[min(22rem,calc(100%-2rem))] rounded-xl bg-surface p-6 text-foreground shadow-card backdrop:bg-ink-950/50"
      >
        {ask.kind === "offline" ? (
          <>
            <div className="space-y-3">
              <CloudOff aria-hidden className="size-8 text-warning" />
              <h2 id="logout-title" className="text-lg font-semibold">
                Log out needs signal
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                You can keep working — everything is saved on this phone. Try
                logging out again when you’re back online.
              </p>
            </div>
            <div className="mt-6 flex flex-col">
              <button
                type="button"
                data-autofocus
                onClick={close}
                className={`${button} bg-primary text-base text-primary-foreground hover:bg-primary-hover active:bg-primary-active`}
              >
                OK
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <TriangleAlert aria-hidden className="size-8 text-warning" />
              <h2 id="logout-title" className="text-lg font-semibold">
                {ask.count} {ask.count === 1 ? "item hasn’t" : "items haven’t"}{" "}
                synced yet
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                They’ll stay on this phone and sync next time you log in.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                data-autofocus
                onClick={close}
                className={`${button} bg-primary text-base text-primary-foreground hover:bg-primary-hover active:bg-primary-active`}
              >
                Go back
              </button>
              <button
                type="button"
                onClick={() => {
                  close();
                  void leave();
                }}
                className={`${button} border border-danger text-base text-danger hover:bg-danger-soft`}
              >
                Log out anyway
              </button>
            </div>
          </>
        )}
      </dialog>
    </form>
  );
}
