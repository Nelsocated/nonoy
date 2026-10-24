// Money and kilos as whole centavos / hundredths — never floats — so the phone's
// totals match the backend's Decimal(10, 2) columns exactly.

const DECIMAL = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

export function toCenti(value: string): number {
  const m = DECIMAL.exec(value.trim());
  if (!m) throw new Error(`Not a 2-decimal number: ${value}`);
  const n = Number(m[2]) * 100 + Number((m[3] ?? "").padEnd(2, "0"));
  return m[1] ? -n : n;
}

export function fromCenti(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

// "12.5" (how the API sends a Decimal) → "12.50"
export const twoDp = (value: string) => fromCenti(toCenti(value));

// kilos × price per kilo, rounded half-up to the centavo (same as the backend)
export function saleAmount(kilo: string, pricePerKilo: string): string {
  const product = BigInt(toCenti(kilo)) * BigInt(toCenti(pricePerKilo)); // in 1/10000 pesos
  return fromCenti(Number((product + BigInt(50)) / BigInt(100)));
}

// "₱1,234.50" for display
export function peso(value: string) {
  const n = toCenti(value);
  const whole = Math.trunc(Math.abs(n) / 100).toLocaleString("en-PH");
  return `${n < 0 ? "-" : ""}₱${whole}.${String(Math.abs(n) % 100).padStart(2, "0")}`;
}
