"use client";

import { TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { logout } from "@/app/(auth)/login/actions";
import { clearAdminCache } from "@/lib/offline/admin-cache";
import { getDb } from "@/lib/offline/db";
import { clearPageCaches } from "@/lib/offline/sw-caches";

const button =
  "min-h-11 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100";

// Warns before logging out with unsynced items (they stay on the phone and sync
// at the next login), and wipes cached pages/data so the next person on a
// shared phone can't see them.
export function LogoutButton({ userId }: { userId: string }) {
  const form = useRef<HTMLFormElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [unsynced, setUnsynced] = useState(0);
  const [leaving, setLeaving] = useState(false);

  async function leave() {
    setLeaving(true);
    await Promise.allSettled([clearAdminCache(), clearPageCaches()]);
    form.current?.requestSubmit();
  }

  async function onClick() {
    const count = await getDb()
      .outbox.where("userId")
      .equals(userId)
      .count()
      .catch(() => 0);
    if (count === 0) return leave();
    setUnsynced(count);
    dialog.current?.showModal();
  }

  const items = `${unsynced} ${unsynced === 1 ? "item hasn’t" : "items haven’t"}`;

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
        <div className="space-y-3">
          <TriangleAlert aria-hidden className="size-8 text-warning" />
          <h2 id="logout-title" className="text-lg font-semibold">
            {items} synced yet
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            They’ll stay on this phone and sync next time you log in.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => dialog.current?.close()}
            className={`${button} bg-primary text-base text-primary-foreground hover:bg-primary-hover active:bg-primary-active`}
          >
            Go back
          </button>
          <button
            type="button"
            onClick={() => {
              dialog.current?.close();
              void leave();
            }}
            className={`${button} border border-danger text-base text-danger hover:bg-danger-soft`}
          >
            Log out anyway
          </button>
        </div>
      </dialog>
    </form>
  );
}
