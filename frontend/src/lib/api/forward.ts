// Rules for what the /api/* forwarder may pass on to Nest.

// /auth/* hands out tokens; those must stay in httpOnly cookies, so the browser
// logs in through the server action instead.
export function isForwardable(path: string[]) {
  if (path.some((s) => s === "." || s === ".." || s === "")) return false;
  return path[0]?.toLowerCase() !== "auth";
}

// Tells Nest who the real client is (its rate limit is per IP, and every call
// comes from this server). The secret proves the header came from us.
export function backendHeaders(incoming: Headers, secret: string | undefined): Record<string, string> {
  const ip = incoming.get("x-forwarded-for")?.split(",")[0]?.trim() || incoming.get("x-real-ip")?.trim();
  if (!secret || !ip) return {};
  return { "X-Forwarded-For": ip, "X-Internal-Secret": secret };
}

export function targetUrl(base: string, path: string[], search: string) {
  return `${base.replace(/\/$/, "")}/${path.map(encodeURIComponent).join("/")}${search}`;
}
