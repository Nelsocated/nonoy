// Placeholder until the client sends their logo — swap the box for an <Image> then.

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div
      aria-label="Nonoy"
      role="img"
      className={`size-10 rounded-md border border-dashed border-input bg-surface ${className}`}
    />
  );
}
