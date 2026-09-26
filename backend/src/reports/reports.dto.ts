import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Dates are calendar days in the report timezone (REPORT_TIMEZONE, default Asia/Manila).
// Both ends are inclusive. Omitted → the last 7 days up to today.
export class ReportRangeDto {
  @IsOptional()
  @Matches(DAY, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DAY, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}

export class DailyReportDto extends ReportRangeDto {
  // narrow the daily summary to one worker
  @IsOptional()
  @IsUUID()
  workerId?: string;
}

// GET /reports/problems?page=2 — 15 per page, capped so OFFSET stays sane
export class ProblemsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page?: number;
}

// PATCH /reports/problems/:kind/:id/check
export class CheckProblemDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(200)
  note?: string;
}
