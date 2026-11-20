/** An API failure that keeps the HTTP status and the server's machine-readable code for callers to branch on. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Builds an `ApiError` from a failed response, using the server's `message` and `error` fields when present. */
export async function apiErrorFromResponse(res: Response, fallbackMessage: string): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as { message?: unknown; error?: unknown };
  return new ApiError(
    typeof body.message === "string" ? body.message : `${fallbackMessage} (${res.status})`,
    res.status,
    typeof body.error === "string" ? body.error : undefined,
  );
}
