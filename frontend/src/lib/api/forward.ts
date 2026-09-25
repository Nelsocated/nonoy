// Rules for what the /api/* forwarder may pass on to Nest.

// /auth/* hands out tokens; those must stay in httpOnly cookies, so the browser
// logs in through the server action instead.
export function isForwardable(path: string[]) {
  if (path.some((s) => s === "." || s === ".." || s === "")) return false;
  return path[0]?.toLowerCase() !== "auth";
}

export function targetUrl(base: string, path: string[], search: string) {
  return `${base.replace(/\/$/, "")}/${path.map(encodeURIComponent).join("/")}${search}`;
}
