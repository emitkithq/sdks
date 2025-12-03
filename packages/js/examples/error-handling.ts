/**
 * Error handling example - Type-safe error handling
 */

import {
  EmitKit,
  EmitKitError,
  RateLimitError,
  ValidationError
} from '../src';

async function main() {
  const client = new EmitKit('emitkit_xxxxxxxxxxxxxxxxxxxxx');

  // Example 1: Validation errors
  console.log('Example 1: Handling validation errors\n');
  try {
    // Missing required field (channelName)
    await client.events.create({
      title: 'Test Event'
    } as any);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log('❌ Validation Error:');
      console.log('   Message:', error.message);
      console.log('   Status:', error.statusCode);
      console.log('   Request ID:', error.requestId);
      console.log('   Validation errors:');
      error.validationErrors.forEach((err) => {
        console.log(`     - ${err.path.join('.')}: ${err.message}`);
      });
    }
  }

  // Example 2: Rate limit errors
  console.log('\nExample 2: Handling rate limit errors\n');
  try {
    // Simulate rate limit by making many requests
    // (In real scenarios, you'd hit this organically)
    for (let i = 0; i < 150; i++) {
      await client.events.create({
        channelName: 'test',
        title: `Event ${i}`
      });
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.log('❌ Rate Limit Exceeded:');
      console.log('   Message:', error.message);
      console.log('   Limit:', error.rateLimit.limit);
      console.log('   Remaining:', error.rateLimit.remaining);
      console.log('   Resets in:', Math.ceil(error.rateLimit.resetIn / 1000), 'seconds');
      console.log('   Request ID:', error.requestId);

      // Wait for rate limit to reset
      console.log(`\n⏳ Waiting ${Math.ceil(error.rateLimit.resetIn / 1000)}s for rate limit reset...`);
      await new Promise((resolve) => setTimeout(resolve, error.rateLimit.resetIn));
      console.log('✅ Rate limit reset! You can make requests again.');
    }
  }

  // Example 3: Authentication errors
  console.log('\nExample 3: Handling authentication errors\n');
  try {
    const badClient = new EmitKit('invalid_key');
    await badClient.events.create({
      channelName: 'test',
      title: 'Test'
    });
  } catch (error) {
    if (error instanceof EmitKitError) {
      if (error.statusCode === 401) {
        console.log('❌ Authentication Error:');
        console.log('   Message:', error.message);
        console.log('   Hint: Check your API key');
      }
    }
  }

  // Example 4: Generic error handling
  console.log('\nExample 4: Generic error handling\n');
  try {
    await client.events.create({
      channelName: 'test',
      title: 'Test Event'
    });
  } catch (error) {
    if (error instanceof EmitKitError) {
      // All EmitKit errors have these fields
      console.log('Error details:');
      console.log('  Type:', error.name);
      console.log('  Message:', error.message);
      console.log('  Status Code:', error.statusCode);
      console.log('  Request ID:', error.requestId);

      // Log for debugging
      if (error.requestId) {
        console.log(`\n💡 Include request ID ${error.requestId} in support tickets`);
      }
    } else {
      // Network or other unexpected errors
      console.error('Unexpected error:', error);
    }
  }
}

main();
