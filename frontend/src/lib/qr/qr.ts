import jsQR from "jsqr";
import QRCode from "qrcode";
import { toCenti } from "@/lib/trip/money";

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

// CRC-16/CCITT-FALSE, the checksum QR Ph / EMVCo payment codes end with.
export function crc16(text: string): number {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

// A payment QR (starts "000201") ends in "6304" + its checksum; a mismatch means
// the screenshot was misread and buyers' apps would reject it. Other text
// (e.g. a link) has no checksum to check.
export function qrTextOk(text: string): boolean {
  if (!text.startsWith("000201")) return true;
  if (text.slice(-8, -4) !== "6304") return false;
  const sum = crc16(text.slice(0, -4)).toString(16).toUpperCase();
  return text.slice(-4).toUpperCase() === sum.padStart(4, "0");
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
  // zero would show the buyer "₱0.00" (the sale can't be saved like that either)
  if (!total || tooBig || toCenti(total) <= 0)
    return { ready: false, hint: "Enter the kilos and price first." };
  return { ready: true, hint: null };
}
