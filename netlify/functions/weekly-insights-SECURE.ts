// netlify/functions/weekly-insights.ts
// 🔒 SECURE VERSION with Database Enforcement
import { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '' // Service role for scheduled function
);

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// ═══════════════════════════════════════════════════════════
// Helper: Build Weekly Payload
// ═══════════════════════════════════════════════════════════
const buildWeeklyPayload = (trades: any[]) => {
  if (!trades.length) throw new Error('No trades');

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const totalPnL = trades.reduce((s, t) => s + (t.pnl || 0), 0);

  const sorted = [...trades].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return {
    weekRange: `${sorted[0]?.date} → ${sorted[sorted.length - 1]?.date}`,
    totalTrades: trades.length,
    winRate: (wins.length / trades.length) * 100,
    totalPnL,
    avgWin: wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0,
    avgLoss: losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0,
  };
};

// ═══════════════════════════════════════════════════════════
// Generate Insight for Single User
// ═══════════════════════════════════════════════════════════
const generateInsightForUser = async (userId: string) => {
  if (!ai) {
    console.error('❌ Gemini AI not configured');
    return null;
  }

  try {
    // Get current week trades
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', weekEnd.toISOString().split('T')[0])
      .is('deleted_at', null);

    if (error) throw error;
    if (!trades || trades.length === 0) {
      console.log(`ℹ️  User ${userId}: No trades this week`);
      return null;
    }

    // ═══════════════════════════════════════════════════════════
    // 🔒 CRITICAL: Use Database RPC Function (Enforces Pro + One Per Week)
    // ═══════════════════════════════════════════════════════════
    
    // First check if user can generate insight (Pro + no duplicate)
    const { error: canGenerateError } = await supabase
      .rpc('can_generate_weekly_insight', { p_user_id: userId });

    if (canGenerateError) {
      console.log(`⚠️  User ${userId}: Cannot generate - ${canGenerateError.message}`);
      return null;
    }

    // Build payload and generate AI insight
    const payload = buildWeeklyPayload(trades);
    const compactPayload = JSON.stringify(payload, null, 0);

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are an elite trading performance coach delivering a weekly performance review.

TRADER STATS THIS WEEK:
${compactPayload}

Write a focused weekly debrief covering:
1. **Edge Assessment** — Is their strategy producing a positive expectancy? Cite the profit factor and win rate directly.
2. **Leak Identification** — What is costing them money?
3. **Psychological Pattern** — What does their trading reveal about their psychology this week?
4. **One Hard Rule** — A single, specific, actionable rule to implement next week based on their data.

Use bold headers. Be direct, data-driven, and clinical. Under 300 words. Reference their actual numbers.`,
      config: { temperature: 0.65, topP: 0.9 }
    });

    const insightText = response.text || 'AI failed to generate insight.';

    // ═══════════════════════════════════════════════════════════
    // 🔒 CRITICAL: Save Using Secure RPC Function
    // ═══════════════════════════════════════════════════════════
    const { data: insightId, error: saveError } = await supabase
      .rpc('generate_weekly_insight', {
        p_user_id: userId,
        p_insight: insightText
      });

    if (saveError) {
      console.error(`❌ Failed to save insight for ${userId}:`, saveError);
      return null;
    }

    console.log(`✅ Generated insight for user ${userId}`);
    return insightId;

  } catch (error: any) {
    console.error(`❌ Error generating insight for ${userId}:`, error);
    
    // Log error to database
    await supabase
      .from('error_logs')
      .insert({
        user_id: userId,
        error_type: 'weekly_insight_generation_failed',
        error_message: error.message,
        metadata: { function: 'weekly-insights' }
      });
    
    return null;
  }
};

// ═══════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════
const handler: Handler = async (event, context) => {
  console.log('🚀 Starting weekly insights generation...');

  try {
    // Get all Pro users
    const { data: proUsers, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('plan', 'pro');

    if (error) throw error;
    if (!proUsers || proUsers.length === 0) {
      console.log('ℹ️  No Pro users found');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No Pro users to process' })
      };
    }

    console.log(`📊 Processing ${proUsers.length} Pro users...`);

    // Generate insights for each Pro user
    const results = await Promise.allSettled(
      proUsers.map(user => generateInsightForUser(user.id))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Complete: ${successful} successful, ${failed} failed`);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        processed: proUsers.length,
        successful,
        failed
      })
    };

  } catch (error: any) {
    console.error('❌ Critical error in weekly insights:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Weekly insights generation failed',
        message: error.message 
      })
    };
  }
};

// Schedule to run every Friday at 18:00 UTC (defined in netlify.toml)
export { handler };
