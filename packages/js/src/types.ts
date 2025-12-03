/**
 * Additional types and utilities for EmitKit SDK
 */

export interface EmitKitConfig {
  /** API key with format: emitkit_xxxxxxxxxxxxxxxxxxxxx */
  apiKey: string;
  /** Base URL for API requests */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
}

export interface RateLimitInfo {
  /** Maximum requests allowed in the current time window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp (seconds) when the rate limit resets */
  reset: number;
  /** Milliseconds until reset */
  resetIn: number;
}

export interface RequestOptions {
  /** Idempotency key for safe retries */
  idempotencyKey?: string;
  /** Request timeout override */
  timeout?: number;
  /** Additional headers */
  headers?: Record<string, string>;
}

export interface EmitKitResponse<T> {
  /** Response data */
  data: T;
  /** Rate limit information */
  rateLimit: RateLimitInfo;
  /** Unique request ID for debugging */
  requestId: string;
  /** Whether this was an idempotent replay */
  wasReplayed: boolean;
}

export class EmitKitError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly requestId?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'EmitKitError';
  }
}

export class RateLimitError extends EmitKitError {
  constructor(
    public readonly rateLimit: RateLimitInfo,
    requestId?: string
  ) {
    super(
      `Rate limit exceeded. Resets in ${Math.ceil(rateLimit.resetIn / 1000)}s`,
      429,
      requestId
    );
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends EmitKitError {
  constructor(
    message: string,
    public readonly validationErrors: Array<{ path: string[]; message: string }>,
    requestId?: string
  ) {
    super(message, 400, requestId, validationErrors);
    this.name = 'ValidationError';
  }
}
