/**
 * Idempotency example - Safe retries for webhooks and payments
 */

import { EmitKit } from '../src';

async function main() {
  const client = new EmitKit('emitkit_xxxxxxxxxxxxxxxxxxxxx');

  // Example: Processing a payment webhook
  // Use a unique key based on the payment ID or webhook event ID
  const paymentId = 'payment_123';
  const idempotencyKey = `payment-${paymentId}-webhook`;

  try {
    console.log('Processing payment webhook...');

    // First request - creates the event
    const result1 = await client.events.create(
      {
        channelName: 'payments',
        title: 'Payment Received',
        metadata: {
          paymentId,
          amount: 99.99,
          currency: 'USD'
        }
      },
      { idempotencyKey }
    );

    console.log('First request:');
    console.log('  Event ID:', result1.data.id);
    console.log('  Was replayed:', result1.wasReplayed); // false
    console.log('  Request ID:', result1.requestId);

    // Simulate webhook retry (e.g., network failure, timeout)
    console.log('\nSimulating webhook retry...');

    // Second request - returns cached response
    const result2 = await client.events.create(
      {
        channelName: 'payments',
        title: 'Payment Received',
        metadata: {
          paymentId,
          amount: 99.99,
          currency: 'USD'
        }
      },
      { idempotencyKey }
    );

    console.log('Second request (retry):');
    console.log('  Event ID:', result2.data.id); // Same as result1
    console.log('  Was replayed:', result2.wasReplayed); // true
    console.log('  Request ID:', result2.requestId); // Same as result1

    // Verify both responses are identical
    if (result1.data.id === result2.data.id) {
      console.log('\n✅ Idempotency working correctly!');
      console.log('   No duplicate events were created.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
