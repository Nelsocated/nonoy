import type { Http } from "../http";
import type {
  DailyReport,
  DailyReportQuery,
  DiscrepancyReport,
  OpenTrip,
  ProblemKind,
  ProblemsPage,
  ReportRange,
  TripDetail,
  TripsPage,
  WorkerReport,
} from "../types";

export const reports = (http: Http) => ({
  /** OWNER/ADMIN */
  daily: (q: DailyReportQuery = {}) =>
    http.get<DailyReport>("/reports/daily", q),
  /** OWNER/ADMIN */
  workers: (q: ReportRange = {}) =>
    http.get<WorkerReport>("/reports/workers", q),
  /** OWNER/ADMIN */
  discrepancies: (q: ReportRange = {}) =>
    http.get<DiscrepancyReport>("/reports/discrepancies", q),
  /** OWNER/ADMIN — trips not ended yet */
  openTrips: () => http.get<OpenTrip[]>("/reports/open-trips"),
  /** OWNER/ADMIN — unchecked problems, 15 per page, newest first */
  problems: (page = 1) => http.get<ProblemsPage>("/reports/problems", { page }),
  /** OWNER/ADMIN — mark a problem as looked at (optional note) */
  check: (kind: ProblemKind, id: string, note?: string) =>
    http.patch(`/reports/problems/${kind}/${id}/check`, { note }),
  /** OWNER/ADMIN — trips started in a month, 15 per page, newest first */
  trips: (q: { month: string; workerId?: string; page?: number }) =>
    http.get<TripsPage>("/reports/trips", q),
  /** any role — workers only their own trips */
  trip: (id: string) => http.get<TripDetail>(`/reports/trips/${id}`),
});
