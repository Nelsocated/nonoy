import { Suspense } from "react";
import { ReportsScreen } from "@/components/admin/reports-screen";

// ?month= is read in the browser (static route, cached for offline like the others)
export default function ReportsPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
    >
      <ReportsScreen />
    </Suspense>
  );
}
