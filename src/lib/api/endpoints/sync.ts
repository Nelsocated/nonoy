import type { Http } from "../http";
import type { SyncBatch, SyncResults } from "../types";

export const sync = (http: Http) => ({
  /** Worker offline batch; each item reports ok/error on its own */
  push: (batch: SyncBatch) => http.post<SyncResults>("/sync", batch),
});
