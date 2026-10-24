// Vercel sets x-forwarded-for itself; the first entry is the real client.
export const clientIp = (h: Headers) =>
  h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  h.get("x-real-ip")?.trim() ||
  "unknown";
