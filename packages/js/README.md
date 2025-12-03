# @emitkit/js

Official TypeScript/JavaScript SDK for EmitKit API

[![npm version](https://img.shields.io/npm/v/@emitkit/js.svg)](https://www.npmjs.com/package/@emitkit/js)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@emitkit/js)](https://bundlephobia.com/package/@emitkit/js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📦 Installation

```bash
npm install @emitkit/js
# or
pnpm add @emitkit/js
# or
yarn add @emitkit/js
```

## 🚀 Quick Start

```typescript
import { EmitKit } from '@emitkit/js';

// Initialize the client
const client = new EmitKit('emitkit_xxxxxxxxxxxxxxxxxxxxx');

// Create an event
const result = await client.events.create({
  channelName: 'payments',
  title: 'Payment Received',
  description: 'User upgraded to Pro plan',
  icon: '💰',
  metadata: {
    amount: 99.99,
    currency: 'USD',
    plan: 'pro'
  }
});

console.log('Event created:', result.data.id);
console.log('Rate limit:', result.rateLimit);
```

## 📚 Features

- ✅ **Type-Safe**: Full TypeScript support with auto-generated types
- ✅ **Rate Limiting**: Automatic rate limit tracking and handling
- ✅ **Idempotency**: Built-in idempotency key support for safe retries
- ✅ **Error Handling**: Type-safe error classes (ValidationError, RateLimitError)
- ✅ **Zero Dependencies**: No external runtime dependencies
- ✅ **Tree-Shakeable**: Optimized bundle size with ES modules
- ✅ **Request IDs**: Automatic request ID tracking for debugging

## 🎯 Usage

### Basic Event Creation

```typescript
const result = await client.events.create({
  channelName: 'general',
  title: 'Test Event',
  description: 'This is a test event',
  icon: '📝'
});
```

### With Metadata

```typescript
await client.events.create({
  channelName: 'user-signups',
  title: 'New User Registered',
  tags: ['signup', 'onboarding'],
  metadata: {
    email: 'user@example.com',
    plan: 'free',
    source: 'organic'
  },
  userId: 'user_123',
  notify: true,
  displayAs: 'notification'
});
```

### Idempotency

Safe retries for webhooks and payment processing:

```typescript
const result = await client.events.create(
  {
    channelName: 'payments',
    title: 'Payment Received',
    metadata: { paymentId: 'pay_123' }
  },
  { idempotencyKey: 'payment-pay_123-webhook' }
);

// Subsequent requests with the same key return cached response
console.log('Was replayed:', result.wasReplayed);
```

### Rate Limit Tracking

```typescript
const result = await client.events.create({...});

// Check rate limit status
console.log(result.rateLimit);
// {
//   limit: 100,
//   remaining: 95,
//   reset: 1733270400,
//   resetIn: 45000
// }

// Access last known rate limit
console.log(client.rateLimit);
```

### Error Handling

```typescript
import {
  EmitKit,
  EmitKitError,
  RateLimitError,
  ValidationError
} from '@emitkit/js';

try {
  await client.events.create({...});
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limit exceeded!');
    console.log(`Retry in ${error.rateLimit.resetIn}ms`);
  } else if (error instanceof ValidationError) {
    console.log('Validation failed:');
    error.validationErrors.forEach(err => {
      console.log(`- ${err.path.join('.')}: ${err.message}`);
    });
  } else if (error instanceof EmitKitError) {
    console.log(`API Error ${error.statusCode}:`, error.message);
    console.log('Request ID:', error.requestId);
  }
}
```

## ⚙️ Configuration

```typescript
const client = new EmitKit('emitkit_xxxxxxxxxxxxxxxxxxxxx', {
  // Custom base URL (default: 'https://api.emitkit.com')
  baseUrl: 'https://api.your-domain.com',

  // Request timeout in milliseconds (default: 30000)
  timeout: 60000,

  // Custom fetch implementation
  fetch: customFetch
});
```

## 📖 API Reference

### `EmitKit`

Main client class for interacting with the EmitKit API.

#### Constructor

```typescript
new EmitKit(apiKey: string, config?: Partial<EmitKitConfig>)
```

#### Properties

- `rateLimit`: Get the last known rate limit information

#### Methods

##### `events.create(data, options?)`

Create a new event.

**Parameters:**
- `data`: Event data object
  - `channelName` (string, required): Channel name (auto-creates if doesn't exist)
  - `title` (string, required): Event title
  - `description` (string, optional): Event description
  - `icon` (string, optional): Single emoji icon
  - `tags` (string[], optional): Array of tags
  - `metadata` (object, optional): Custom JSON metadata
  - `userId` (string | null, optional): User identifier
  - `notify` (boolean, optional): Send notification (default: true)
  - `displayAs` ('message' | 'notification', optional): Display style
  - `source` (string, optional): Source identifier

- `options` (optional):
  - `idempotencyKey` (string): Idempotency key for safe retries
  - `timeout` (number): Request timeout override
  - `headers` (object): Additional headers

**Returns:** `Promise<EmitKitResponse>`

### Types

#### `EmitKitResponse<T>`

```typescript
{
  data: T;                    // Response data
  rateLimit: RateLimitInfo;   // Rate limit info
  requestId: string;          // Request ID for debugging
  wasReplayed: boolean;       // Idempotent replay flag
}
```

#### `RateLimitInfo`

```typescript
{
  limit: number;      // Max requests allowed
  remaining: number;  // Remaining requests
  reset: number;      // Unix timestamp when limit resets
  resetIn: number;    // Milliseconds until reset
}
```

### Error Classes

#### `EmitKitError`

Base error class for all SDK errors.

**Properties:**
- `message`: Error message
- `statusCode`: HTTP status code
- `requestId`: Request ID for debugging
- `details`: Additional error details

#### `RateLimitError`

Thrown when rate limit is exceeded (HTTP 429).

**Properties:**
- All `EmitKitError` properties
- `rateLimit`: Rate limit information

#### `ValidationError`

Thrown when request validation fails (HTTP 400).

**Properties:**
- All `EmitKitError` properties
- `validationErrors`: Array of validation error details

## 🧪 Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test --coverage
```

## 📝 Examples

See the [examples](./examples) directory for more usage examples:

- [Basic Usage](./examples/basic.ts)
- [Idempotency](./examples/idempotency.ts)
- [Error Handling](./examples/error-handling.ts)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details

## 🔗 Links

- [EmitKit Documentation](https://emitkit.com/docs)
- [API Reference](https://api.emitkit.com/api/docs)
- [GitHub Repository](https://github.com/emitkit/emitkit-sdks)
- [Report Issues](https://github.com/emitkit/emitkit-sdks/issues)

---

**Note**: This SDK is automatically generated from the OpenAPI specification.
