import type { Http } from "../http";
import type { ActivityLog, CreateActivityLogInput } from "../types";

export const activityLogs = (http: Http) => ({
  create: (input: CreateActivityLogInput) =>
    http.post<ActivityLog>("/activity-logs", input),
  /** OWNER/ADMIN */
  list: () => http.get<ActivityLog[]>("/activity-logs"),
});
