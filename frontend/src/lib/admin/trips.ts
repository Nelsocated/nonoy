import { stamp } from "./timeline";

// "Wed, Sep 2 · 6:10 AM → 4:30 PM" (end date added if it's another day)
export function tripTimes(
  startedAt: string,
  endedAt: string | null,
  timeZone?: string,
) {
  const day = new Date(startedAt).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  });
  const start = stamp(startedAt, startedAt, timeZone);
  const end = endedAt ? stamp(endedAt, startedAt, timeZone) : "Still out";
  return `${day} · ${start} → ${end}`;
}
