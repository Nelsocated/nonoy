const HOUR = 60 * 60_000;

// The owner only sees what workers' phones have synced: say how old it is,
// and flag it (stale) after an hour without anything new.
export function syncAge(iso: string | null, now = Date.now()) {
  if (!iso) return { text: "not synced yet", stale: true };
  const ms = now - Date.parse(iso);
  const min = Math.floor(ms / 60_000);
  const text =
    min < 1
      ? "last synced just now"
      : min < 60
        ? `last synced ${min} min ago`
        : `last synced ${Math.floor(min / 60)} h ago`;
  return { text, stale: ms > HOUR };
}
