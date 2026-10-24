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

// a form showing the same rule under its field: the message, or undefined
export function problem(check: () => void): string | undefined {
  try {
    check();
  } catch (e) {
    if (e instanceof InvalidRecordError) return e.message;
    throw e;
  }
}

export function uuid(value: string, label: string) {
  if (!UUID.test(value)) fail(`Pick a ${label}.`);
}

export function amount(value: string, label: string) {
  if (!DECIMAL.test(value.trim()))
    fail(`${label} must be a number with up to 2 decimals.`);
}

// kilos × price can outgrow the column even when both numbers fit on their own
export function saleTotal(value: string) {
  if (!DECIMAL.test(value))
    fail("This sale's total is too large. Check the kilos and price.");
}

export function chickens(value: number, { allowZero = false } = {}) {
  if (!Number.isInteger(value) || value < (allowZero ? 0 : 1))
    fail(
      allowZero
        ? "Chicken count can't be negative."
        : "Chicken count must be at least 1.",
    );
}

// same limits as the backend buyer request DTO
export function buyerName(value: string) {
  const v = value.trim();
  if (!v) fail("Enter the buyer's name.");
  if (v.length > 100) fail("Buyer name is too long (100 characters max).");
}

export function place(value: string) {
  if (value.trim().length > 100)
    fail("Place is too long (100 characters max).");
}

export function description(value: string) {
  const v = value.trim();
  if (!v) fail("Add a description.");
  if (v.length > 200) fail("Description is too long (200 characters max).");
}
