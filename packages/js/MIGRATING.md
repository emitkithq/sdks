# Migrating from @emitkit/js 2 to 3

Version 3 types every request and response, returns data directly, and adds
questions (`ask`), reads, and callback verification. Most code needs three
small changes.

## 1. Methods return the data

```ts
// 2.x
const { data, requestId, rateLimit, wasReplayed } = await client.events.create(input);

// 3.x
const event = await emitkit.events.create(input);
const { requestId, rateLimit, replayed } = emitkit.lastResponse ?? {};
```

`client.rateLimit` is gone too: read `emitkit.lastResponse?.rateLimit`. Its
`reset` is when the window resets in Unix seconds (2.x had `resetIn` in
milliseconds).

## 2. One error class, with `code`

`RateLimitError` and `ValidationError` are gone; every error is an
`EmitKitError`. `statusCode` is now `status`, and `code` is the API's stable
error code.

```ts
// 2.x
if (error instanceof RateLimitError) { … }
if (error instanceof ValidationError) { error.validationErrors }

// 3.x
if (error instanceof EmitKitError && error.code === "rate_limited") { error.retryAfter }
if (error instanceof EmitKitError && error.code === "validation_error") { error.details }
```

## 3. `identify` takes `userId`

```ts
// 2.x
await client.identify({ user_id: "user_123", properties: { plan: "pro" } });

// 3.x
await emitkit.identify({ userId: "user_123", properties: { plan: "pro" } });
```

## Also different

- `new EmitKit()` reads `EMITKIT_API_KEY` (and `EMITKIT_BASE_URL`); the 2.x
  forms `new EmitKit(key)` and `new EmitKit(key, { baseUrl })` still work.
- `events.create` always sends an `Idempotency-Key` (its own when you don't
  pass one), and safe requests are retried twice after network errors, 5xx
  and short 429s. Set `maxRetries: 0` to turn that off.
- Per-request `headers` and `timeout` options are gone; set `timeout` on the
  client.
- The package has no dependencies and needs Node 20 or later (or any runtime
  with `fetch` and Web Crypto).

## New

`ask`, `events.get`, `events.list`, `events.cancel`, `channels.list`,
`identities.delete`, `me`, `verifyCallback`, and types for everything
(`Event`, `Answer`, `Field`, `Action`, …).
