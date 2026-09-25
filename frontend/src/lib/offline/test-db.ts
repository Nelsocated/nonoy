import "fake-indexeddb/auto";
import { OfflineDb } from "./db";

let n = 0;
// a fresh, isolated database per test
export const testDb = () => new OfflineDb(`test-${Date.now()}-${n++}`);
