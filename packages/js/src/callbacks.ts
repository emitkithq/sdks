import { EmitKitError } from "./errors";
import type { Callback } from "./types";

export interface VerifyCallbackOptions {
  /** The project's callback signing secret (`whsec_…`); default `EMITKIT_CALLBACK_SECRET`. */
  secret?: string;
  /** How far `webhook-timestamp` may be from now (default 300 seconds). */
  toleranceSeconds?: number;
}

type Headers_ = Headers | Record<string, string | string[] | undefined>;

const encoder = new TextEncoder();

const header = (headers: Headers_, name: string) => {
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? undefined;
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const key = Object.keys(record).find((candidate) => candidate.toLowerCase() === name);
  const value = key === undefined ? undefined : record[key];
  return Array.isArray(value) ? value[0] : value;
};

const decodeBase64 = (text: string) =>
  Uint8Array.from(atob(text), (character) => character.charCodeAt(0));

/** Equal length and bytes, without stopping at the first difference. */
const same = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
};

const invalid = (message: string) =>
  new EmitKitError(message, { code: "invalid_signature" });

const env = (name: string) => {
  try {
    return (
      (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env?.[name] || undefined
    );
  } catch {
    return undefined;
  }
};

/** Any Request-like object (the global one, undici's, a polyfill's). */
interface RequestLike {
  readonly headers: Headers;
  text(): Promise<string>;
}
const isRequest = (input: unknown): input is RequestLike =>
  typeof input === "object" &&
  input !== null &&
  typeof (input as RequestLike).text === "function" &&
  typeof (input as RequestLike).headers?.get === "function";

/**
 * Checks that a callback came from EmitKit and returns it. Callbacks are
 * signed the Standard Webhooks way with your project's callback signing
 * secret (Settings → API keys). Pass the Request, or its raw body and
 * headers; verify before you parse or act on anything.
 *
 * ```ts
 * export const POST = async (request: Request) => {
 *   const callback = await verifyCallback(request);
 *   if (callback.answer.action === "approve") { … }
 *   return new Response(null, { status: 204 });
 * };
 * ```
 *
 * Throws `EmitKitError` with code `invalid_signature` when it doesn't check out.
 */
export const verifyCallback = async (
  input: Request | RequestLike | { body: string; headers: Headers_ },
  options: VerifyCallbackOptions = {}
): Promise<Callback> => {
  const secret = options.secret ?? env("EMITKIT_CALLBACK_SECRET");
  if (!secret) {
    throw new EmitKitError(
      "Pass the callback signing secret (whsec_…) or set EMITKIT_CALLBACK_SECRET",
      { code: "invalid_signature" }
    );
  }
  let body: string;
  try {
    body = isRequest(input) ? await input.text() : input.body;
  } catch (cause) {
    throw new EmitKitError("Couldn't read the callback's body (was it read already?)", {
      cause,
      code: "invalid_signature",
    });
  }
  const headers = input.headers;
  const id = header(headers, "webhook-id");
  const timestamp = header(headers, "webhook-timestamp");
  const signatures = header(headers, "webhook-signature");
  if (!(id && timestamp && signatures)) {
    throw invalid("Missing webhook-id, webhook-timestamp or webhook-signature");
  }
  const seconds = Number(timestamp);
  const tolerance = options.toleranceSeconds ?? 300;
  if (!Number.isInteger(seconds) || Math.abs(Date.now() / 1000 - seconds) > tolerance) {
    throw invalid("The callback's timestamp is too old or in the future");
  }
  let key: Awaited<ReturnType<typeof crypto.subtle.importKey>>;
  try {
    key = await crypto.subtle.importKey(
      "raw",
      decodeBase64(secret.replace(/^whsec_/u, "")),
      { hash: "SHA-256", name: "HMAC" },
      false,
      ["sign"]
    );
  } catch (cause) {
    throw new EmitKitError(
      "The callback signing secret isn't valid: copy the whole whsec_… value from Settings → API keys",
      { cause, code: "invalid_signature" }
    );
  }
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(`${id}.${timestamp}.${body}`))
  );
  // Space-separated `v1,<base64>` entries: any one may match.
  const matches = signatures.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) {
      return false;
    }
    try {
      return same(decodeBase64(value), expected);
    } catch {
      return false;
    }
  });
  if (!matches) {
    throw invalid("The callback's signature doesn't match this secret");
  }
  try {
    return JSON.parse(body) as Callback;
  } catch (cause) {
    throw new EmitKitError("The callback's body isn't JSON", { cause, code: "invalid_signature" });
  }
};
