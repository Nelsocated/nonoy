// Server-side only in practice: no NEXT_PUBLIC_ prefix, so it is undefined in the browser.
export const API_URL = process.env.API_URL ?? "http://localhost:4000";
