// netlify/functions/create-checkout.ts
// Creates a Stripe Checkout session and returns the URL
// The frontend redirects the user to this URL to complete payment

import { Handler } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { priceId, userId, successUrl, cancelUrl } = JSON.parse(event.body || '{}');

    if (!priceId || !userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing priceId or userId' }) };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${event.headers.origin}/?upgrade=success`,
      cancel_url: cancelUrl || `${event.headers.origin}/?upgrade=cancelled`,
      metadata: {
        supabase_user_id: userId, // This is how the webhook finds the user
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
        },
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
