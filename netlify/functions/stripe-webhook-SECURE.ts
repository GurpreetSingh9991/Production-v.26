// netlify/functions/stripe-webhook.ts
// 🔒 SECURE VERSION with Replay Protection
import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('❌ Missing Stripe signature or webhook secret');
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
    console.error('❌ Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // ═══════════════════════════════════════════════════════════
  // 🔒 CRITICAL: Check if Event Already Processed (Replay Protection)
  // ═══════════════════════════════════════════════════════════
  try {
    const { data: existingEvent } = await supabase
      .from('stripe_events')
      .select('id')
      .eq('id', stripeEvent.id)
      .single();

    if (existingEvent) {
      console.log('✓ Event already processed:', stripeEvent.id);
      return { 
        statusCode: 200, 
        body: JSON.stringify({ received: true, already_processed: true }) 
      };
    }
  } catch (error) {
    // If error is "not found", that's expected - continue processing
    // Any other error should be logged but not block processing
    console.log('Checking event status:', error);
  }

  // ═══════════════════════════════════════════════════════════
  // Handle Stripe Events
  // ═══════════════════════════════════════════════════════════
  
  try {
    switch (stripeEvent.type) {

      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId = session.customer as string;

        if (!userId) {
          console.error('❌ No supabase_user_id in session metadata');
          break;
        }

        console.log(`Processing checkout for user: ${userId}`);

        // Update profile to pro + store Stripe customer ID
        const { error } = await supabase
          .from('profiles')
          .update({ 
            plan: 'pro', 
            stripe_customer_id: customerId 
          })
          .eq('id', userId);

        if (error) {
          console.error('❌ Supabase update error:', error);
          throw error;
        }

        console.log(`✅ User ${userId} upgraded to Pro`);
        
        // 🔒 Mark event as processed
        await supabase
          .from('stripe_events')
          .insert({ 
            id: stripeEvent.id, 
            event_type: stripeEvent.type 
          });
        
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.paused': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(`Processing subscription change for customer: ${customerId}`);

        // Find user by Stripe customer ID and downgrade
        const { data, error } = await supabase
          .from('profiles')
          .update({ plan: 'free' })
          .eq('stripe_customer_id', customerId)
          .select('id');

        if (error) {
          console.error('❌ Supabase downgrade error:', error);
          throw error;
        }

        console.log(`✅ Customer ${customerId} downgraded to Free`);
        
        // 🔒 Mark event as processed
        await supabase
          .from('stripe_events')
          .insert({ 
            id: stripeEvent.id, 
            event_type: stripeEvent.type 
          });
        
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        console.log('⚠️  Payment failed for customer:', customerId);
        
        // Optional: Send grace period notification or downgrade after N failures
        // For now, just log it
        
        // 🔒 Mark event as processed
        await supabase
          .from('stripe_events')
          .insert({ 
            id: stripeEvent.id, 
            event_type: stripeEvent.type 
          });
        
        break;
      }

      default:
        console.log(`ℹ️  Unhandled event type: ${stripeEvent.type}`);
        
        // 🔒 Still mark as processed to avoid retries
        await supabase
          .from('stripe_events')
          .insert({ 
            id: stripeEvent.id, 
            event_type: stripeEvent.type 
          });
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ received: true }) 
    };

  } catch (error: any) {
    console.error('❌ Critical error processing webhook:', error);
    
    // Don't mark as processed if there was an error
    // Stripe will retry
    
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Processing failed', message: error.message }) 
    };
  }
};
