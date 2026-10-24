import { z } from "zod";
import { int, obj, str, uuid } from "./common";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const day = (f: string) => str(f).regex(DAY, `${f} must be YYYY-MM-DD`);

// Calendar days in the report time zone (REPORT_TIMEZONE, default
// Asia/Manila). Both ends inclusive. Omitted → the last 7 days up to today.
export const reportRangeShape = {
  from: day("from").nullish(),
  to: day("to").nullish(),
};
export const reportRangeSchema = obj(reportRangeShape);
export type ReportRangeDto = z.infer<typeof reportRangeSchema>;

export const dailyReportSchema = obj({
  ...reportRangeShape,
  // narrow the daily summary to one worker
  workerId: uuid("workerId").nullish(),
});
export type DailyReportDto = z.infer<typeof dailyReportSchema>;

// 15 per page, capped so OFFSET stays sane
const page = int("page")
  .min(1, "page must not be less than 1")
  .max(10_000, "page must not be greater than 10000");

export const problemsQuerySchema = obj({ page: page.nullish() });

export const checkProblemSchema = obj({
  note: str("note")
    .trim()
    .max(200, "note must be shorter than or equal to 200 characters")
    .nullish(),
});

export const tripsListQuerySchema = obj({
  month: str("month").regex(
    /^2\d{3}-(0[1-9]|1[0-2])$/,
    "month must be YYYY-MM",
  ),
  workerId: uuid("workerId").nullish(),
  page: page.nullish(),
});
export type TripsListQueryDto = z.infer<typeof tripsListQuerySchema>;
