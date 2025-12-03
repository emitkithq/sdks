# @emitkit/js

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
