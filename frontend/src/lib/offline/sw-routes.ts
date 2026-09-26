// Service-worker routing rules, kept here so they can be unit-tested.

// Serwist's default page cache drops copies older than a day, which would stop
// the app opening offline for a worker who was last online yesterday.
export const PAGES_CACHE = "mangfrito-pages";
export const PAGES_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Pages read their ?id= / ?saved= in the browser, so one cached copy serves any
// query — a receipt for a sale saved offline a second ago still opens.
export const PAGES_MATCH_OPTIONS = { ignoreSearch: true };

export function isAppNavigation({
  request,
  url,
  sameOrigin,
}: {
  request: Pick<Request, "mode">;
  url: URL;
  sameOrigin: boolean;
}) {
  return (
    sameOrigin &&
    request.mode === "navigate" &&
    !url.pathname.startsWith("/api/")
  );
}
