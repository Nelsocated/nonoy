import { Suspense } from "react";
import { TripsScreen } from "@/components/admin/trips-screen";

// ?month=&worker=&page= are read in the browser; /admin/trips/[id] is the
// full page of one trip
export default function TripsPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
    >
      <TripsScreen />
    </Suspense>
  );
}
