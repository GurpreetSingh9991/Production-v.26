// netlify/functions/create-checkout.ts
// 🔒 SECURE VERSION with Email Verification Check
import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    const { priceId, userId, successUrl, cancelUrl } = JSON.parse(event.body || '{}');

    if (!priceId || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    // ═══════════════════════════════════════════════════════════
    // 🔒 CRITICAL: Verify Email Before Allowing Checkout
    // ═══════════════════════════════════════════════════════════
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Check if email is verified
    if (!user.email_confirmed_at) {
      return {
        statusCode: 403,
        body: JSON.stringify({ 
          error: 'Email verification required',
          message: 'Please verify your email before upgrading to Pro. Check your inbox for the verification link.'
        })
      };
    }

    // Verify user ID matches
    if (user.id !== userId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'User ID mismatch' })
      };
    }

    // ═══════════════════════════════════════════════════════════
    // 🔒 SECURITY: Rate Limit Checkout Creation
    // ═══════════════════════════════════════════════════════════
    const { data: recentCheckouts } = await supabase
      .from('usage_logs')
      .select('created_at')
      .eq('user_id', userId)
      .eq('action', 'create_checkout')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .limit(5);

    if (recentCheckouts && recentCheckouts.length >= 5) {
      return {
        statusCode: 429,
        body: JSON.stringify({ 
          error: 'Too many requests',
          message: 'Please wait before creating another checkout session.'
        })
      };
    }

    // ═══════════════════════════════════════════════════════════
    // Create Stripe Checkout Session
    // ═══════════════════════════════════════════════════════════
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${event.headers.origin}/?upgrade=success`,
      cancel_url: cancelUrl || `${event.headers.origin}/?upgrade=cancelled`,
      metadata: {
        supabase_user_id: userId,
      },
      customer_email: user.email,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    // Log usage
    await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        action: 'create_checkout',
        metadata: {
          session_id: session.id,
          price_id: priceId
        }
      });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: session.url }),
    };

  } catch (error: any) {
    console.error('❌ Checkout error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Checkout creation failed',
        message: error.message 
      }),
    };
  }
};
