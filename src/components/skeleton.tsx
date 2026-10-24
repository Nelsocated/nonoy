// Grey placeholders shaped like the screen that's coming, shown while a page
// or its data loads. Screen readers hear one "Loading…" per placeholder.
import { titleBar } from "@/lib/ui/styles";

const card = "overflow-hidden rounded-xl border bg-surface shadow-card";

export function Bone({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded-md bg-muted motion-reduce:animate-none ${className}`}
    />
  );
}

function Loading({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

function Rows({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-16 items-center gap-4 px-5">
          <div className="flex-1 space-y-2">
            <Bone className={`h-3.5 ${i % 2 ? "w-1/3" : "w-2/5"}`} />
            <Bone className={`h-3 ${i % 2 ? "w-1/2" : "w-3/5"}`} />
          </div>
          <Bone className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

// grey rows inside a list card that is already on screen
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <Loading>
      <Rows rows={rows} />
    </Loading>
  );
}

// a whole list card: heading strip + rows
function ListCard({ rows }: { rows: number }) {
  return (
    <div className={card}>
      <div className="border-b border-brand-100 bg-primary-soft px-5 py-3">
        <Bone className="h-3.5 w-28 bg-brand-100" />
      </div>
      <Rows rows={rows} />
    </div>
  );
}

function Stats() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className={`${card} space-y-2 p-4`}>
          <Bone className="h-3 w-16" />
          <Bone className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

// the part of an admin screen under its title: optional totals tiles + a list
export function ContentSkeleton({ stats = false }: { stats?: boolean }) {
  return (
    <Loading className="space-y-5">
      {stats && <Stats />}
      <ListCard rows={6} />
    </Loading>
  );
}

// an admin screen: title, a line under it, optional totals tiles, one list
export function AdminPageSkeleton({ stats = false }: { stats?: boolean }) {
  return (
    <Loading className="mx-auto max-w-4xl space-y-5">
      <div className="space-y-2">
        <div className={titleBar} />
        <Bone className="h-7 w-40" />
        <Bone className="h-4 w-64 max-w-full" />
      </div>
      {stats && <Stats />}
      <ListCard rows={6} />
    </Loading>
  );
}

// a receipt card: heading, a few label/value lines, the total
export function ReceiptSkeleton() {
  return (
    <Loading className={`${card} mx-auto max-w-sm space-y-4 p-6`}>
      <Bone className="mx-auto h-5 w-32" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex justify-between gap-4">
          <Bone className="h-3.5 w-20" />
          <Bone className="h-3.5 w-24" />
        </div>
      ))}
      <Bone className="h-7" />
    </Loading>
  );
}

// a field home-like screen: the red trip card, action tiles, a list
export function FieldPageSkeleton() {
  return (
    <Loading className="space-y-5">
      <Bone className="h-32 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <ListCard rows={3} />
    </Loading>
  );
}

// a field form (sale, pickup, expense, recount): title, fields, save button
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <Loading className="space-y-5">
      <Bone className="h-7 w-40" />
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Bone className="h-3.5 w-24" />
          <Bone className="h-12" />
        </div>
      ))}
      <Bone className="h-12 bg-brand-100" />
    </Loading>
  );
}
