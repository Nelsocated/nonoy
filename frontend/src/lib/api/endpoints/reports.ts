import type { Http } from "../http";
import type { DailyReport, DailyReportQuery, DiscrepancyReport, ReportRange, TripDetail, WorkerReport } from "../types";

export const reports = (http: Http) => ({
  /** OWNER/ADMIN */
  daily: (q: DailyReportQuery = {}) => http.get<DailyReport>("/reports/daily", q),
  /** OWNER/ADMIN */
  workers: (q: ReportRange = {}) => http.get<WorkerReport>("/reports/workers", q),
  /** OWNER/ADMIN */
  discrepancies: (q: ReportRange = {}) => http.get<DiscrepancyReport>("/reports/discrepancies", q),
  /** any role — workers only their own trips */
  trip: (id: string) => http.get<TripDetail>(`/reports/trips/${id}`),
});
