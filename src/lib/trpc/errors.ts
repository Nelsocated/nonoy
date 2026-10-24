// What every failed server call becomes on the client: screens and the sync
// engine branch on `status` (401 pause, 429 back off, 4xx reject).
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
