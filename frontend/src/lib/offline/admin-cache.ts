import { clear, createStore, del, get, set } from "idb-keyval";

export const ADMIN_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const store = () => createStore("mangfrito-admin", "queries");

// async-storage persister interface, backed by IndexedDB
export const adminStorage = {
  getItem: (key: string) => get<string>(key, store()),
  setItem: (key: string, value: string) => set(key, value, store()),
  removeItem: (key: string) => del(key, store()),
};

// business data must not outlive the session on a shared phone
export const clearAdminCache = () => clear(store());

export function asOf(updatedAt: number, now = Date.now()) {
  const d = new Date(updatedAt);
  const sameDay = new Date(now).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
  return sameDay
    ? `as of ${time}`
    : `as of ${d.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}, ${time}`;
}
