import jsQR from "jsqr";
import QRCode from "qrcode";

export const MAX_QR_CODES = 10;
export const MAX_QR_TEXT = 1000;

// The text inside a QR image, or null. Tries inverted too (dark-mode screenshots).
export function readQr(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): string | null {
  const found = jsQR(pixels, width, height, {
    inversionAttempts: "attemptBoth",
  });
  return found?.data || null;
}

// Browser only: read a picked screenshot/photo. Big photos are scaled down
// first; transparent PNGs get a white background so the QR stays readable.
export async function readQrFromFile(file: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return readQr(ctx.getImageData(0, 0, w, h).data, w, h);
}

// The QR for `text` as one SVG path: 1 unit per module, 4-module quiet zone.
export function qrSvgPath(text: string): { size: number; d: string } {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = modules.size;
  let d = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (modules.data[y * n + x]) d += `M${x + 4} ${y + 4}h1v1h-1z`;
  return { size: n + 8, d };
}

// Whether the sale form's "Show QR" button can open, and why not.
export function showQrState(
  total: string | null,
  tooBig: boolean,
  codes: number,
): { ready: boolean; hint: string | null } {
  if (codes === 0)
    return { ready: false, hint: "No QR codes yet — ask the owner." };
  if (!total || tooBig)
    return { ready: false, hint: "Enter the kilos and price first." };
  return { ready: true, hint: null };
}
