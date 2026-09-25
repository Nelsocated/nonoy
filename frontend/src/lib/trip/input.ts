// Typing filters for number fields (the numeric keypad still allows stray
// characters on some phones, and pasted text can be anything).

// whole numbers only (chickens)
export const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

// up to 2 decimals (kilos, pesos): digits and a single dot
export const decimal = (v: string) => {
  const [whole, ...rest] = v.replace(/[^\d.]/g, "").split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
};
