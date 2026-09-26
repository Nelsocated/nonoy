import { Suspense } from "react";
import { ReportsScreen } from "@/components/admin/reports-screen";
import { AdminPageSkeleton } from "@/components/skeleton";

// ?month= is read in the browser (static route, cached for offline like the others)
export default function ReportsPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton stats />}>
      <ReportsScreen />
    </Suspense>
  );
}
