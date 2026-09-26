---
"@emitkit/js": major
---

SDK 3: typed requests and responses, and everything the API does now.

- `ask()` sends an event with buttons or fields and waits for the answer from someone's phone.
- `events.get`, `events.list` (paged), `events.cancel`, `channels.list`, `identities.delete`, `me`.
- `verifyCallback()` checks callbacks from events with a `callbackUrl` (Standard Webhooks).
- Methods return the data; `lastResponse` has the request id, rate limit and replay flag.
- One `EmitKitError` with the API's stable `code`; `identify` takes `userId`.
- `new EmitKit()` reads `EMITKIT_API_KEY`; `events.create` retries safely with an automatic `Idempotency-Key`.
- No dependencies. See MIGRATING.md for upgrading from 2.x.
