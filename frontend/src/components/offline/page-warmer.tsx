"use client";

import { useEffect } from "react";
import type { Role } from "@/lib/api/types";
import { warmPages } from "@/lib/offline/sw-caches";

// With signal, keep a copy of every screen this user can open, so after
// opening any one page they all open offline — also once signal comes back.
export function PageWarmer({ role }: { role: Role }) {
  useEffect(() => {
    const warm = () => void warmPages(role);
    if (navigator.onLine) warm();
    window.addEventListener("online", warm);
    return () => window.removeEventListener("online", warm);
  }, [role]);
  return null;
}
