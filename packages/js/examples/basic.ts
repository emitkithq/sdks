/**
 * Basic usage example for EmitKit SDK
 */

import { EmitKit } from '../src';

async function main() {
  // Initialize the client
  const client = new EmitKit('emitkit_xxxxxxxxxxxxxxxxxxxxx', {
    baseUrl: 'http://localhost:5173/api' // Use production URL in real apps
  });

  try {
    // Create a simple event
    const result = await client.events.create({
      channelName: 'general',
      title: 'Test Event',
      description: 'This is a test event from the SDK',
      icon: '📝'
    });

    console.log('Event created successfully!');
    console.log('Event ID:', result.data.id);
    console.log('Request ID:', result.requestId);
    console.log('Rate limit:', result.rateLimit);

    // Create a payment event with metadata
    const paymentResult = await client.events.create({
      channelName: 'payments',
      title: 'Payment Received',
      description: 'User upgraded to Pro plan',
      icon: '💰',
      tags: ['payment', 'upgrade'],
      metadata: {
        amount: 99.99,
        currency: 'USD',
        plan: 'pro',
        userId: 'user_123'
      },
      notify: true,
      displayAs: 'notification'
    });

    console.log('\nPayment event created!');
    console.log('Event ID:', paymentResult.data.id);
    console.log('Channel:', paymentResult.data.channelName);

    // Check rate limit status
    console.log('\nRate Limit Status:');
    console.log(`${client.rateLimit?.remaining}/${client.rateLimit?.limit} requests remaining`);
    console.log(`Resets in ${Math.ceil((client.rateLimit?.resetIn || 0) / 1000)} seconds`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
