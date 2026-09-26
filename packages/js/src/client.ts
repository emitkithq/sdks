import { EmitKitError } from "./errors";
import type {
  Channel,
  CreateEventInput,
  Erasure,
  Event,
  EventPage,
  IdentifyInput,
  Identity,
  ListEventsInput,
  Me,
  RateLimit,
  ResponseInfo,
} from "./types";

declare const __VERSION__: string;

export interface EmitKitOptions {
  /** Default: the `EMITKIT_API_KEY` environment variable. */
  apiKey?: string;
  /** Default `https://api.emitkit.com`; set it for a self-hosted EmitKit. */
  baseUrl?: string;
  /** Per request, in milliseconds (default 30,000). */
  timeout?: number;
  /** Retries after a network error, a timeout, a 429 or a 5xx (default 2). */
  maxRetries?: number;
  /** Default: the global `fetch`. */
  fetch?: typeof fetch;
}

export interface CreateOptions {
  /**
   * Retrying with the same key returns the first result instead of creating
   * a second event (kept 24 hours). The SDK makes one up per call so its own
   * retries are safe; pass yours to make your retries safe too.
   */
  idempotencyKey?: string;
}

export interface AskOptions extends CreateOptions {
  /** Stop waiting after this many milliseconds and return the event, still pending (default: until it expires). */
  timeout?: number;
  /** How often to check for the answer, in milliseconds (default 3,000). */
  pollInterval?: number;
  /** Stop waiting when aborted (rejects with the signal's reason). */
  signal?: AbortSignal;
}

/** An event that asked, and its answer. */
export type Asked = Event & { answer: NonNullable<Event["answer"]> };

interface Request {
  readonly signal?: AbortSignal | undefined;
  readonly method: "GET" | "POST" | "DELETE";
  readonly path: string;
  readonly body?: unknown;
  readonly query?: Record<string, string | number | undefined>;
  readonly idempotencyKey?: string;
  /** Safe to send twice: a read, idempotent by contract, or with an Idempotency-Key. */
  readonly retry: boolean;
}

const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
/** Don't sleep through a long rate-limit window: give the caller the 429. */
const MAX_RETRY_WAIT_SECONDS = 10;

/** An environment variable, or undefined (no `process`, no permission, or empty). */
const env = (name: string) => {
  try {
    const value = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env?.[name];
    return value || undefined;
  } catch {
    // Deno without --allow-env for this variable.
    return undefined;
  }
};

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

const isoOf = (value: string | Date | undefined) =>
  value instanceof Date ? value.toISOString() : value;

const rateLimitOf = (headers: Headers): RateLimit | null => {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");
  return limit && remaining && reset
    ? { limit: Number(limit), remaining: Number(remaining), reset: Number(reset) }
    : null;
};

const asks = (input: CreateEventInput) =>
  (input.fields?.length ?? 0) > 0 ||
  (input.actions ?? []).some((action) => "id" in action);

/**
 * The EmitKit API.
 *
 * ```ts
 * const emitkit = new EmitKit(); // reads EMITKIT_API_KEY
 * await emitkit.events.create({ channelName: "payments", title: "New subscription" });
 * ```
 */
export class EmitKit {
  /** What the last response said besides its data: request id, rate limit, replay. */
  lastResponse: ResponseInfo | null = null;

  readonly #apiKey: string | undefined;
  readonly #baseUrl: string;
  readonly #timeout: number;
  readonly #maxRetries: number;
  readonly #fetch: typeof fetch | undefined;

  constructor(apiKey?: string | EmitKitOptions, options: EmitKitOptions = {}) {
    const settings = typeof apiKey === "string" ? { ...options, apiKey } : { ...apiKey, ...options };
    // Only read the environment for what wasn't passed (Deno asks per variable).
    this.#apiKey = settings.apiKey || env("EMITKIT_API_KEY");
    this.#baseUrl = (settings.baseUrl || env("EMITKIT_BASE_URL") || "https://api.emitkit.com").replace(/\/+$/u, "");
    this.#timeout = settings.timeout ?? 30_000;
    this.#maxRetries = settings.maxRetries ?? 2;
    this.#fetch = settings.fetch;
  }

  readonly events = {
    /** Sends an event. With buttons or fields it asks, and waits for an answer (see `ask`). */
    create: (input: CreateEventInput, options: CreateOptions & { signal?: AbortSignal } = {}) =>
      this.#request<Event>({
        body: input,
        idempotencyKey: options.idempotencyKey ?? crypto.randomUUID(),
        method: "POST",
        path: "/v1/events",
        retry: true,
        signal: options.signal,
      }),
    /** One event by id, with its answer. */
    get: (id: string, options: { signal?: AbortSignal } = {}) =>
      this.#request<Event>({
        method: "GET",
        path: `/v1/events/${encodeURIComponent(id)}`,
        retry: true,
        signal: options.signal,
      }),
    /** A page of the project's events, newest first. */
    list: (input: ListEventsInput = {}) =>
      this.#request<EventPage>({
        method: "GET",
        path: "/v1/events",
        query: {
          before: isoOf(input.before),
          channel: input.channel,
          limit: input.limit,
          since: isoOf(input.since),
        },
        retry: true,
      }),
    /** Stops an event from waiting for an answer (fine to call twice). */
    cancel: (id: string) =>
      this.#request<Event>({
        method: "POST",
        path: `/v1/events/${encodeURIComponent(id)}/cancel`,
        retry: true,
      }),
  };

  readonly channels = {
    /** The project's channels, by name. */
    list: async () =>
      (
        await this.#request<{ channels: Channel[] }>({
          method: "GET",
          path: "/v1/channels",
          retry: true,
        })
      ).channels,
  };

  readonly identities = {
    /** Erases an identity: its properties and aliases. */
    delete: (userId: string) =>
      this.#request<Erasure>({
        method: "DELETE",
        path: `/v1/identities/${encodeURIComponent(userId)}`,
        retry: false,
      }),
  };

  /** Creates or updates one of your users' identity (properties merge, aliases add up). */
  identify(input: IdentifyInput) {
    return this.#request<Identity>({
      body: input,
      method: "POST",
      path: "/v1/identify",
      retry: true,
    });
  }

  /** The key's organization, project and scopes. */
  me() {
    return this.#request<Me>({ method: "GET", path: "/v1/me", retry: true });
  }

  /**
   * Asks a person and waits for the answer: sends an event with buttons
   * and/or fields, then checks until it's answered, expires or is canceled.
   * For a long-lived process (a script, a CLI, an agent session); serverless
   * code should send `callbackUrl` with `events.create` instead.
   *
   * ```ts
   * const { answer } = await emitkit.ask({
   *   channelName: "refunds",
   *   title: "Refund Jane $240?",
   *   actions: [{ id: "approve", label: "Refund" }, { id: "deny", label: "Don't" }],
   * });
   * if (answer.action === "approve") { … } // anything else is a no
   * ```
   */
  async ask(input: CreateEventInput, options: AskOptions = {}): Promise<Asked> {
    if (!asks(input)) {
      throw new EmitKitError("ask() needs a button (an action with an id) or a field", {
        code: "validation_error",
      });
    }
    const { signal } = options;
    signal?.throwIfAborted();
    const deadline = options.timeout === undefined ? Number.POSITIVE_INFINITY : Date.now() + options.timeout;
    let event = await this.events.create(input, options);
    while (event.answer?.status === "pending" && Date.now() < deadline) {
      await sleep(Math.min(options.pollInterval ?? 3000, Math.max(0, deadline - Date.now())), signal);
      try {
        event = await this.events.get(event.id, { signal });
      } catch (error) {
        // A long wait outlives a spent rate limit (other traffic on the key): wait it out.
        if (error instanceof EmitKitError && error.code === "rate_limited") {
          await sleep((error.retryAfter ?? 60) * 1000, signal);
          continue;
        }
        throw error;
      }
    }
    if (!event.answer) {
      throw new EmitKitError("The event doesn't wait for an answer", { code: "not_waiting" });
    }
    return event as Asked;
  }

  async #request<T>(request: Request): Promise<T> {
    if (!this.#apiKey) {
      throw new EmitKitError("Pass an API key or set EMITKIT_API_KEY (Settings → API keys)", {
        code: "missing_api_key",
      });
    }
    const url = new URL(`${this.#baseUrl}${request.path}`);
    for (const [name, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(name, String(value));
      }
    }
    const headers: Record<string, string> = {
      accept: "application/json",
      authorization: `Bearer ${this.#apiKey}`,
      "user-agent": `emitkit-js/${__VERSION__}`,
    };
    if (request.body !== undefined) {
      headers["content-type"] = "application/json";
    }
    if (request.idempotencyKey) {
      headers["idempotency-key"] = request.idempotencyKey;
    }
    const body = request.body === undefined ? undefined : JSON.stringify(request.body);
    // Called unbound: Cloudflare Workers reject fetch called as a method of another object.
    const send = this.#fetch ?? globalThis.fetch;
    for (let attempt = 0; ; attempt += 1) {
      const retriesLeft = request.retry && attempt < this.#maxRetries;
      request.signal?.throwIfAborted();
      const timeout = AbortSignal.timeout(this.#timeout);
      let response: Response;
      let text: string;
      try {
        response = await send(url, {
          body,
          headers,
          method: request.method,
          signal: request.signal ? AbortSignal.any([request.signal, timeout]) : timeout,
        });
        text = await response.text();
      } catch (cause) {
        request.signal?.throwIfAborted();
        this.lastResponse = null;
        const timedOut = cause instanceof Error && cause.name === "TimeoutError";
        if (retriesLeft) {
          await sleep(backoff(attempt), request.signal);
          continue;
        }
        throw new EmitKitError(
          timedOut ? `No response within ${this.#timeout} ms` : `Couldn't reach ${this.#baseUrl}`,
          { cause, code: timedOut ? "timeout" : "network_error" }
        );
      }
      const retryAfter = Number(response.headers.get("retry-after") ?? Number.NaN);
      // A retry that finds its first attempt still running (it timed out on
      // our side) gets 409 for the same key: wait for that attempt's result.
      const stillRunning = attempt > 0 && response.status === 409 && request.idempotencyKey !== undefined;
      if (
        retriesLeft &&
        (stillRunning || RETRY_STATUSES.has(response.status)) &&
        !(retryAfter > MAX_RETRY_WAIT_SECONDS)
      ) {
        await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : backoff(attempt), request.signal);
        continue;
      }
      return this.#read<T>(response, text, Number.isFinite(retryAfter) ? retryAfter : null);
    }
  }

  #read<T>(response: Response, text: string, retryAfter: number | null): T {
    let json: Record<string, unknown> = {};
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      // Not JSON: a proxy's error page, say. Reported by status below.
    }
    const requestId =
      (typeof json.requestId === "string" ? json.requestId : null) ?? response.headers.get("x-request-id");
    this.lastResponse = {
      rateLimit: rateLimitOf(response.headers),
      replayed: response.headers.get("x-idempotent-replay") === "true",
      requestId,
    };
    if (response.ok && json.success === true) {
      return json.data as T;
    }
    const message =
      [json.error, json.message].filter((part) => typeof part === "string").join(": ") ||
      `HTTP ${response.status}`;
    throw new EmitKitError(message, {
      code: typeof json.code === "string" ? json.code : response.ok ? "internal_error" : `http_${response.status}`,
      details: Array.isArray(json.details) ? (json.details as EmitKitError["details"]) : [],
      requestId,
      retryAfter,
      status: response.status,
    });
  }
}

/** 0.5 s, 1 s, 2 s … with jitter. */
const backoff = (attempt: number) => 500 * 2 ** attempt * (0.75 + Math.random() / 2);
