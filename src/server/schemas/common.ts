import { z } from "zod";

// Building blocks that fail with the same words class-validator used, so the
// messages screens show (and tests pin) don't change. `f` is the field name.

// unknown keys are rejected, like the old ValidationPipe's forbidNonWhitelisted
export const obj = <T extends z.ZodRawShape>(shape: T) =>
  z.strictObject(shape, {
    error: (iss) =>
      iss.code === "unrecognized_keys"
        ? iss.keys.map((k) => `property ${k} should not exist`).join(", ")
        : undefined,
  });

export const str = (f: string) => z.string({ error: `${f} must be a string` });

export const minLength = (f: string, n: number, message?: string) =>
  str(f).min(
    n,
    message ?? `${f} must be longer than or equal to ${n} characters`,
  );

export const maxLength = (f: string, n: number) =>
  str(f).max(n, `${f} must be shorter than or equal to ${n} characters`);

// @Transform(trim) + @IsNotEmpty
export const trimmedRequired = (f: string, message: string) =>
  str(f).trim().min(1, message);

export const notEmpty = (f: string) =>
  str(f).min(1, `${f} should not be empty`);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuid = (f: string) => str(f).regex(UUID, `${f} must be a UUID`);

// a URL id (old ParseUUIDPipe)
export const idParam = z
  .string({ error: "Validation failed (uuid is expected)" })
  .regex(UUID, "Validation failed (uuid is expected)");

// @IsDateString: an ISO 8601 date or date-time
const ISO =
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
export const isoDate = (f: string) =>
  str(f).refine(
    (v) => ISO.test(v) && !Number.isNaN(Date.parse(v)),
    `${f} must be a valid ISO 8601 date string`,
  );

// @IsDecimalAmount: matches the Decimal(10, 2) columns
export const decimalAmount = (f: string) =>
  str(f).regex(
    /^\d{1,8}(\.\d{1,2})?$/,
    `${f} must be a non-negative number with up to 2 decimals`,
  );

export const bool = (f: string) =>
  z.boolean({ error: `${f} must be a boolean value` });

export const int = (f: string) =>
  z
    .number({ error: `${f} must be an integer number` })
    .int(`${f} must be an integer number`);

export const enumOf = <const T extends readonly [string, ...string[]]>(
  f: string,
  values: T,
) =>
  z.enum(values, {
    error: `${f} must be one of the following values: ${values.join(", ")}`,
  });

export const array = <T extends z.ZodType>(f: string, item: T) =>
  z.array(item, { error: `${f} must be an array` });
