import Image from "next/image";

// Full Mang Frito logo for now; a chicken-only mark for small sizes is coming from the client.
export function Logo({ className = "size-10" }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Mang Frito"
      width={512}
      height={512}
      priority
      className={`rounded-full ${className}`}
    />
  );
}
