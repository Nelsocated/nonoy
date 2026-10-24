// "Wed, Sep 2": the day a trip started, in Manila time
export function tripDay(startedAt: string, timeZone = "Asia/Manila") {
  return new Date(startedAt).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ?worker= — anything that isn't a user id means "all workers"
export const parseWorker = (raw: string | null) =>
  raw && UUID.test(raw) ? raw : "";

// ?back= on a trip page: only a trips list address, never another site
export const tripsBack = (raw: string | undefined | null) =>
  raw && /^\/admin\/trips(\?[^/\\]*)?$/.test(raw) ? raw : null;
