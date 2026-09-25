// Service-worker routing rules, kept here so they can be unit-tested.

// Serwist's default page cache drops copies older than a day, which would stop
// the app opening offline for a worker who was last online yesterday.
export const PAGES_CACHE = "mangfrito-pages";
export const PAGES_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

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
