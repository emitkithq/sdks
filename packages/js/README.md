# @emitkit/js

The EmitKit SDK for TypeScript and JavaScript. Send events to your phone, ask
a person for a decision and get the answer back, list what happened, and
verify callbacks. No dependencies; runs on Node 20+, Bun, Deno, Cloudflare
Workers and anything else with `fetch`.

```bash
npm install @emitkit/js
```

```ts
import { EmitKit } from "@emitkit/js";

const emitkit = new EmitKit(); // reads EMITKIT_API_KEY

await emitkit.events.create({
  channelName: "payments",
  title: "New subscription",
  icon: "💰",
  metadata: { amount: 49, currency: "USD", plan: "pro" },
});
```

Create an API key in EmitKit under **Settings → API keys**. Pass it as
`new EmitKit("emitkit_…")`, or set `EMITKIT_API_KEY`. Keys are for servers:
never ship one in a browser or mobile app.

## Ask for a decision

An event with buttons (actions with an `id`) or fields waits for an answer.
The people subscribed to its channel get a push; the first to answer decides.

```ts
const { answer } = await emitkit.ask({
  channelName: "refunds",
  title: "Refund Jane Cooper $240 for order #1042?",
  description: "Arrived damaged: 2 of 3 items broken.",
  fields: [
    {
      id: "resolution",
      type: "choice",
      label: "Resolution",
      options: [
        { id: "full", label: "Full refund ($240)" },
        { id: "partial", label: "Broken items only ($160)" },
      ],
    },
  ],
  actions: [
    { id: "approve", label: "Refund", style: "primary" },
    { id: "deny", label: "Don't refund", style: "destructive" },
    { label: "Open order", url: "https://shop.example.com/orders/1042" },
  ],
  expiresIn: 1800,
});

if (answer.status === "answered" && answer.action === "approve") {
  await refund(1042, answer.values?.resolution);
}
// Anything else (deny, expired, canceled) is a no.
```

`ask` sends the event, then checks every 3 seconds until it's answered,
expires or is canceled, and returns the event with its `answer`. Pass
`{ timeout }` (ms) to stop waiting earlier (the answer is then still
`pending`), or a `signal` to abort. A network retry never asks twice.

Field types: `choice` (with `multiple` for checkboxes), `text`, `number`,
`boolean`. `answer.values` holds each field's value by its `id`.

### Serverless: get a callback instead

`ask` suits a script, a CLI or an agent session. A serverless function can't
wait for hours, so send `callbackUrl` and let EmitKit call you, with your own
state in `resume`:

```ts
await emitkit.events.create({
  channelName: "refunds",
  title: "Refund Jane $240?",
  actions: [
    { id: "approve", label: "Refund" },
    { id: "deny", label: "Don't" },
  ],
  callbackUrl: "https://shop.example.com/api/emitkit",
  resume: JSON.stringify({ orderId: 1042 }),
});
```

```ts
// app/api/emitkit/route.ts
import { verifyCallback } from "@emitkit/js";

export const POST = async (request: Request) => {
  // EMITKIT_CALLBACK_SECRET: the project's signing secret (whsec_…), Settings → API keys.
  const callback = await verifyCallback(request);
  if (callback.type === "event.answered" && callback.answer.action === "approve") {
    const { orderId } = JSON.parse(callback.resume ?? "{}");
    await refund(orderId);
  }
  return new Response(null, { status: 204 });
};
```

`verifyCallback` checks the Standard Webhooks signature and timestamp, and
throws `EmitKitError` with code `invalid_signature` when it doesn't check
out. Callbacks can arrive more than once: `webhook-id` stays the same, so
drop repeats.

## Everything else

```ts
const event = await emitkit.events.get("event_…"); // with its answer
await emitkit.events.cancel("event_…"); // stop a question from waiting

const page = await emitkit.events.list({ channel: "payments", limit: 20 });
const next = await emitkit.events.list({ before: page.nextCursor ?? undefined });

const channels = await emitkit.channels.list();

await emitkit.identify({
  userId: "user_123",
  properties: { email: "jane@example.com", plan: "pro" },
  aliases: ["jane@example.com"],
});
await emitkit.identities.delete("user_123"); // erasure requests

const me = await emitkit.me(); // organization, project, scopes
```

Every method returns the data (`Event`, `EventPage`, `Channel[]`, …).
`emitkit.lastResponse` holds the last response's `requestId`, `rateLimit` and
whether it was an idempotent `replayed` result.

## Idempotency and retries

`events.create` sends an `Idempotency-Key`, so the SDK's own retries never
create a second event. Pass yours to make your retries safe too:

```ts
await emitkit.events.create(input, { idempotencyKey: `order-${order.id}` });
```

Requests that are safe to repeat are retried twice after a network error, a
timeout, a 5xx or a short `429` (a rate-limit wait over 10 seconds is
returned to you instead).

## Errors

Every error is an `EmitKitError`. Switch on `code`:

```ts
import { EmitKitError } from "@emitkit/js";

try {
  await emitkit.events.create(input);
} catch (error) {
  if (error instanceof EmitKitError && error.code === "validation_error") {
    console.log(error.details); // [{ path: ["fields", 0, "options"], message: "…" }]
  }
  throw error;
}
```

| `code` | Means |
| --- | --- |
| `validation_error` | The request doesn't match; `details` names each problem and its fix |
| `unauthorized` | The key is missing or wrong |
| `forbidden` | The key can't do this (read-only keys only read) or its project is gone |
| `not_found` | No such event or identity |
| `idempotency_conflict` | The idempotency key was used with a different request |
| `not_pending`, `not_waiting` | Cancel on an answered event, or one that never asked |
| `payload_too_large` | Over 16 KB per event |
| `rate_limited` | Over 100 requests a minute; `retryAfter` says how long to wait |
| `internal_error` | Something failed on EmitKit's side |
| `network_error`, `timeout` | No response |
| `missing_api_key` | No key passed and no `EMITKIT_API_KEY` |
| `invalid_signature` | `verifyCallback` rejected the callback |

`status` and `requestId` are on the error too; quote the request id when you
contact support.

## Options

```ts
new EmitKit({
  apiKey: "emitkit_…", // default: EMITKIT_API_KEY
  baseUrl: "https://api.emitkit.com", // default: EMITKIT_BASE_URL, for self-hosting
  timeout: 30_000, // per request, ms
  maxRetries: 2,
  fetch, // your own fetch
});
```

Upgrading from 2.x? See [MIGRATING.md](./MIGRATING.md).

## License

MIT
