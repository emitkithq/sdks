/**
 * Every error the SDK throws. Switch on `code`: the API's stable error code
 * (`validation_error`, `unauthorized`, `forbidden`, `not_found`,
 * `idempotency_conflict`, `not_pending`, `not_waiting`, `payload_too_large`,
 * `rate_limited`, `internal_error`), or the SDK's own: `network_error`,
 * `timeout`, `invalid_signature`, `missing_api_key`, and `http_<status>` for a
 * response that wasn't EmitKit's (a proxy's error page).
 */
export class EmitKitError extends Error {
  override readonly name = "EmitKitError";
  /** Stable: switch on this, not on `message`. */
  readonly code: string;
  /** The HTTP status; 0 when no response arrived. */
  readonly status: number;
  /** Quote this when you contact support. */
  readonly requestId: string | null;
  /** For `validation_error`: each problem's `path` and `message`. */
  readonly details: { path: (string | number)[]; message: string }[];
  /** For `rate_limited`: seconds until you may try again. */
  readonly retryAfter: number | null;

  constructor(
    message: string,
    options: {
      code: string;
      status?: number;
      requestId?: string | null;
      details?: { path: (string | number)[]; message: string }[];
      retryAfter?: number | null;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options.cause });
    this.code = options.code;
    this.status = options.status ?? 0;
    this.requestId = options.requestId ?? null;
    this.details = options.details ?? [];
    this.retryAfter = options.retryAfter ?? null;
  }
}
