// netlify/functions/apple-iap.ts
// Called by the iOS app after a successful Apple IAP purchase.
// Verifies the user's Supabase JWT, then upgrades their profile to 'pro'.
// On cancellation/refund — iOS calls this with action: 'downgrade'.

import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Service role client — can write to profiles table
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 1. Get the user's JWT from the Authorization header
  const authHeader = event.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing authorization token' }) };
  }

  // 2. Verify the JWT with Supabase — this confirms it's a real logged-in user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    console.error('❌ JWT verification failed:', authError?.message);
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  // 3. Parse the request body
  let body: { action?: string; productId?: string; transactionId?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const action     = body.action     || 'upgrade';    // 'upgrade' or 'downgrade'
  const productId  = body.productId  || '';
  const transactionId = body.transactionId || '';

  console.log(`📱 Apple IAP — user: ${user.id}, action: ${action}, product: ${productId}, tx: ${transactionId}`);

  // 4. Update the profile
  const newPlan = action === 'downgrade' ? 'free' : 'pro';
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      plan: newPlan,
      apple_transaction_id: transactionId || null,
      apple_product_id: productId || null,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('❌ Supabase update error:', updateError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update plan' }) };
  }

  console.log(`✅ User ${user.id} → ${newPlan} (Apple IAP)`);
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, plan: newPlan, userId: user.id }),
  };
};
