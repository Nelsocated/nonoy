// Same rules as the backend DTOs (class-validator), checked before anything is
// queued: the backend validates a /sync batch as a whole, so one bad record
// would otherwise get the entire batch rejected.

export class InvalidRecordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRecordError";
  }
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECIMAL = /^\d{1,8}(\.\d{1,2})?$/; // backend IsDecimalAmount, Decimal(10, 2)

const fail = (message: string): never => {
  throw new InvalidRecordError(message);
};

export function uuid(value: string, label: string) {
  if (!UUID.test(value)) fail(`Pick a ${label}.`);
}

export function amount(value: string, label: string) {
  if (!DECIMAL.test(value.trim()))
    fail(`${label} must be a number with up to 2 decimals.`);
}

export function chickens(value: number, { allowZero = false } = {}) {
  if (!Number.isInteger(value) || value < (allowZero ? 0 : 1))
    fail(
      allowZero
        ? "Chicken count can't be negative."
        : "Chicken count must be at least 1.",
    );
}

export function description(value: string) {
  const v = value.trim();
  if (!v) fail("Add a description.");
  if (v.length > 200) fail("Description is too long (200 characters max).");
}
