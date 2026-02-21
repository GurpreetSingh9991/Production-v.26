import { getSupabaseClient } from './supabase';

/**
 * Queries the profiles table for the user's plan column.
 * Returns 'free' if query fails or row not found.
 */
export const getUserPlan = async (userId: string): Promise<'free' | 'pro'> => {
  const supabase = getSupabaseClient();
  if (!supabase) return 'free';

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    if (error || !data) return 'free';
    return data.plan === 'pro' ? 'pro' : 'free';
  } catch (e) {
    return 'free';
  }
};

/**
 * Queries the trades table for user's trade count in the current calendar month.
 */
export const getTradeCountThisMonth = async (userId: string): Promise<number> => {
  const supabase = getSupabaseClient();
  if (!supabase) return 0;

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  try {
    const { count, error } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('date', firstDayOfMonth);

    if (error) return 0;
    return count || 0;
  } catch (e) {
    return 0;
  }
};

/**
 * Determines if a user is permitted to add a new trade based on their current usage and plan limits.
 * Free limit: 15 trades/month. Pro limit: Unlimited.
 */
export const canUserAddTrade = async (userId: string): Promise<{ 
  allowed: boolean; 
  reason?: string; 
  count: number; 
  limit: number 
}> => {
  const [plan, count] = await Promise.all([
    getUserPlan(userId),
    getTradeCountThisMonth(userId)
  ]);

  if (plan === 'pro') {
    return { allowed: true, count, limit: Infinity };
  }

  const FREE_LIMIT = 15;
  if (count >= FREE_LIMIT) {
    return { 
      allowed: false, 
      reason: 'Free plan limit of 15 trades/month reached. Upgrade to Pro for unlimited trades.', 
      count, 
      limit: FREE_LIMIT 
    };
  }

  return { allowed: true, count, limit: FREE_LIMIT };
};

/**
 * Determines if a user is permitted to add a new account based on their plan.
 * Free limit: 1 account. Pro limit: Unlimited.
 */
export const canUserAddAccount = async (userId: string, currentAccountCount: number): Promise<{
  allowed: boolean;
  reason?: string;
  limit: number;
}> => {
  const plan = await getUserPlan(userId);
  
  if (plan === 'pro') {
    return { allowed: true, limit: Infinity };
  }

  const FREE_ACCOUNT_LIMIT = 1;
  if (currentAccountCount >= FREE_ACCOUNT_LIMIT) {
    return {
      allowed: false,
      reason: 'Free plan is limited to 1 account. Upgrade to Pro for multi-broker management.',
      limit: FREE_ACCOUNT_LIMIT
    };
  }

  return { allowed: true, limit: FREE_ACCOUNT_LIMIT };
};

// NOTE: upgradeToPro has been intentionally removed from the frontend.
// The plan column can ONLY be updated by the Stripe webhook Netlify function
// (netlify/functions/stripe-webhook.ts) which uses the SERVICE ROLE key.
// This prevents any user from self-upgrading via the browser console.

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Checkout — creates a Stripe Checkout session and redirects the user
// Call this from your "Upgrade to Pro" button instead of window.open(stripeLink)
// ─────────────────────────────────────────────────────────────────────────────

export const startStripeCheckout = async (userId: string): Promise<void> => {
  const priceId = import.meta.env?.VITE_STRIPE_PRICE_ID || process.env.VITE_STRIPE_PRICE_ID || '';
  const successUrl = `${window.location.origin}/?upgrade=success`;
  const cancelUrl = `${window.location.origin}/?upgrade=cancelled`;

  if (!priceId) {
    // Fallback to direct Stripe Payment Link if price ID not configured
    const paymentLink = import.meta.env?.VITE_STRIPE_PAYMENT_LINK || process.env.VITE_STRIPE_PAYMENT_LINK || '';
    if (paymentLink) {
      window.open(`${paymentLink}?client_reference_id=${userId}`, '_blank');
      return;
    }
    console.error('No VITE_STRIPE_PRICE_ID or VITE_STRIPE_PAYMENT_LINK set');
    return;
  }

  try {
    const response = await fetch('/.netlify/functions/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, userId, successUrl, cancelUrl }),
    });
    const { url } = await response.json();
    if (url) window.location.href = url;
  } catch (err) {
    console.error('Checkout error:', err);
    // Fallback to direct payment link
    const paymentLink = import.meta.env?.VITE_STRIPE_PAYMENT_LINK || '';
    if (paymentLink) window.open(`${paymentLink}?client_reference_id=${userId}`, '_blank');
  }
};
