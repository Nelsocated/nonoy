import { useMemo } from "react";
import { qrSvgPath } from "@/lib/qr/qr";

// A payment QR redrawn from its text. Pure black on white with a quiet zone:
// scanners need full contrast, so no theme colours here.
export function QrImage({
  payload,
  label,
  className = "",
}: {
  payload: string;
  label: string;
  className?: string;
}) {
  const { size, d } = useMemo(() => qrSvgPath(payload), [payload]);
  return (
    <svg
      role="img"
      aria-label={`${label} QR code`}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={`aspect-square ${className}`}
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
