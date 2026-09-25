// Typing filters for number fields (the numeric keypad still allows stray
// characters on some phones, and pasted text can be anything).

// whole numbers only (chickens)
export const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

// digits and a single dot; extra decimals are allowed while typing and
// rounded to 2 by round2() when the field is left or the form is saved
export const decimal = (v: string) => {
  const [whole, ...rest] = v.replace(/[^\d.]/g, "").split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 6)}` : whole;
};

// More than 2 decimals → normal rounding (half-up), same rule as the backend's
// sale totals: 10.255 → 10.26, 10.254 → 10.25. 2 or fewer decimals are kept.
export function round2(v: string): string {
  const m = /^(\d*)(?:\.(\d*))?$/.exec(v.trim());
  if (!m || v.trim() === "") return v.trim();
  const [, whole = "", frac = ""] = m;
  if (frac.length <= 2) return frac ? `${whole || "0"}.${frac}` : whole;
  // integer maths on the first 3 decimals: hundredths + half-up on the third
  const centi = BigInt(whole || "0") * BigInt(100) + BigInt(frac.slice(0, 2));
  const rounded = Number(frac[2]) >= 5 ? centi + BigInt(1) : centi;
  const s = rounded.toString().padStart(3, "0");
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}

// What decimal fields store on each keystroke: filtered, and rounded once a
// third decimal appears ("10." and "10.2" stay as typed so typing isn't blocked).
export function typedAmount(v: string) {
  const d = decimal(v);
  return /\.\d{3,}$/.test(d) ? round2(d) : d;
}
