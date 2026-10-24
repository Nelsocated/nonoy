import type { ZodError } from "zod";

export type AppErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS";

// A failure the user should see: its message reaches the screen unchanged.
export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Same names and default messages as the Nest exceptions the services were
// written with, so the ported services read the same.
export class BadRequestException extends AppError {
  constructor(message = "Bad Request") {
    super("BAD_REQUEST", message);
  }
}
export class UnauthorizedException extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message);
  }
}
export class ForbiddenException extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message);
  }
}
export class NotFoundException extends AppError {
  constructor(message = "Not Found") {
    super("NOT_FOUND", message);
  }
}
export class ConflictException extends AppError {
  constructor(message = "Conflict") {
    super("CONFLICT", message);
  }
}

// every failed rule, in one line (what the old API's error message looked like)
export const zodMessage = (err: ZodError) =>
  err.issues.map((i) => i.message).join(", ");
