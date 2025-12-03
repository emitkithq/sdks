/**
 * EmitKit JavaScript/TypeScript SDK
 *
 * Official SDK for the EmitKit API - Real-time event tracking and notifications
 *
 * @example
 * ```typescript
 * import { EmitKit } from '@emitkit/js';
 *
 * const client = new EmitKit('emitkit_xxxxxxxxxxxxxxxxxxxxx');
 *
 * await client.events.create({
 *   channelName: 'payments',
 *   title: 'Payment Received',
 *   metadata: { amount: 99.99 }
 * });
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { EmitKit } from './client';

// Types and errors
export type {
  EmitKitConfig,
  RateLimitInfo,
  RequestOptions,
  EmitKitResponse
} from './types';

export {
  EmitKitError,
  RateLimitError,
  ValidationError
} from './types';

// Re-export generated types
// Note: These will be available after running `pnpm run generate`
// export type * from './generated/types';
