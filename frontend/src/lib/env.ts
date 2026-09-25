// Server-side only in practice: no NEXT_PUBLIC_ prefix, so these are undefined in the browser.
export const API_URL = process.env.API_URL ?? "http://localhost:4000";

// Shared with the backend so it trusts the X-Forwarded-For we send (per-user rate limits).
export const INTERNAL_PROXY_SECRET = process.env.INTERNAL_PROXY_SECRET;
