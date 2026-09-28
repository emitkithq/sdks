# @emitkit/js

## 3.0.0

### Major Changes

- 1db6641: SDK 3: typed requests and responses, and everything the API does now.

  - `ask()` sends an event with buttons or fields and waits for the answer from someone's phone.
  - `events.get`, `events.list` (paged), `events.cancel`, `channels.list`, `identities.delete`, `me`.
  - `verifyCallback()` checks callbacks from events with a `callbackUrl` (Standard Webhooks).
  - Methods return the data; `lastResponse` has the request id, rate limit and replay flag.
  - One `EmitKitError` with the API's stable `code`; `identify` takes `userId`.
  - `new EmitKit()` reads `EMITKIT_API_KEY`; `events.create` retries safely with an automatic `Idempotency-Key`.
  - No dependencies. See MIGRATING.md for upgrading from 2.x.

## 3.0.0-next.0

### Major Changes

- 1db6641: SDK 3: typed requests and responses, and everything the API does now.

  - `ask()` sends an event with buttons or fields and waits for the answer from someone's phone.
  - `events.get`, `events.list` (paged), `events.cancel`, `channels.list`, `identities.delete`, `me`.
  - `verifyCallback()` checks callbacks from events with a `callbackUrl` (Standard Webhooks).
  - Methods return the data; `lastResponse` has the request id, rate limit and replay flag.
  - One `EmitKitError` with the API's stable `code`; `identify` takes `userId`.
  - `new EmitKit()` reads `EMITKIT_API_KEY`; `events.create` retries safely with an automatic `Idempotency-Key`.
  - No dependencies. See MIGRATING.md for upgrading from 2.x.

## 2.1.1

### Patch Changes

- 56dd3d8: Fix "Illegal invocation" on every request in Cloudflare Workers: the client called `fetch` as a method of its config object, which workerd rejects. It now calls the global `fetch` (or the one passed in `config.fetch`) unbound.

## 2.1.0

### Minor Changes

- aa6604f: Add user identification with properties and aliases

  - Add `client.identify()` method for tracking user identities with custom properties and aliases
  - Track users with custom properties (email, name, plan, signup date, etc.)
  - Create multiple aliases per user (email, username, external IDs)
  - Events API automatically resolves aliases to canonical user IDs
  - Comprehensive test coverage including partial alias failures
  - Full TypeScript support with IntelliSense
  - Clean API design following industry best practices (Segment, Amplitude)

## 2.0.0

### Major Changes

- 1c3ec57: Initial release of EmitKit TypeScript/JavaScript SDK

  Features:

  - Type-safe API client generated from OpenAPI specification
  - Custom EmitKit wrapper with enhanced developer experience
  - Rate limit tracking and automatic header parsing
  - Idempotency key support for safe retries
  - Type-safe error handling (EmitKitError, RateLimitError, ValidationError)
  - Request ID tracking for debugging
  - Zero runtime dependencies
  - Tree-shakeable ES modules
  - Full TypeScript support with auto-generated types
  - CJS and ESM builds
  - Generated using @hey-api/openapi-ts v0.88.0
