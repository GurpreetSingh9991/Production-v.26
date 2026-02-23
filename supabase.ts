// netlify/functions/stripe-webhook.ts
// Handles Stripe webhook → updates user plan to 'pro' in Supabase
// Deploy this with your app. Set environment variables in Netlify dashboard.

import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '' // Use service role key (not anon key) for webhook
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('Missing Stripe signature or webhook secret');
    return { statusCode: 400, body: 'Missing signature' };
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body || '',
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // ── Handle Stripe Events ───────────────────────────────────────────────────
  switch (stripeEvent.type) {

    case 'checkout.session.completed': {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const customerId = session.customer as string;

      if (!userId) {
        console.error('No supabase_user_id in session metadata');
        break;
      }

      // Update profile to pro + store Stripe customer ID
      const { error } = await supabase
        .from('profiles')
        .update({ plan: 'pro', stripe_customer_id: customerId })
        .eq('id', userId);

      if (error) console.error('Supabase update error:', error);
      else console.log(`✓ User ${userId} upgraded to Pro`);
      break;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Find user by Stripe customer ID and downgrade
      const { data, error } = await supabase
        .from('profiles')
        .update({ plan: 'free' })
        .eq('stripe_customer_id', customerId)
        .select('id');

      if (error) console.error('Supabase downgrade error:', error);
      else console.log(`✓ Customer ${customerId} downgraded to Free`);
      break;
    }

    case 'invoice.payment_failed': {
      // Optional: send a grace period notification
      console.log('Payment failed for customer:', (stripeEvent.data.object as any).customer);
      break;
    }

    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
