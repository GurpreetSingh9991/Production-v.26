// netlify/functions/weekly-insights.ts
// ─────────────────────────────────────────────────────────────────────────────
// Netlify Scheduled Function — runs every Friday at 18:00 UTC (after US market close)
// Fetches all PRO users' trades from Supabase, generates AI insights in batches,
// writes results back to profiles table (single row per user — replaces old insight).
//
// Schedule: set in netlify.toml → [functions."weekly-insights"] schedule = "0 18 * * 5"
//
// Required env vars (already in your Netlify dashboard):
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   VITE_GEMINI_API_KEY
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

// ── Clients ───────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '' // service role bypasses RLS
);

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || '' });

// ── Week helpers ──────────────────────────────────────────────────────────
const getWeekKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
};

const getMondayISO = (): string => {
  const now = new Date();
  const day = now.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
};

// ── Token-Optimised Payload Builder ──────────────────────────────────────
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const buildPayload = (trades: any[]) => {
  const wins   = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const totalPnL  = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const grossWin  = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  const setups: Record<string, { wins: number; total: number }> = {};
  trades.forEach(t => {
    const k = t.setup_type || 'Unknown';
    if (!setups[k]) setups[k] = { wins: 0, total: 0 };
    setups[k].total++;
    if (t.pnl > 0) setups[k].wins++;
  });
  const setupList = Object.entries(setups)
    .map(([name, s]) => ({ name, wr: s.total ? +(s.wins / s.total * 100).toFixed(0) : 0, n: s.total }))
    .sort((a, b) => b.wr - a.wr);

  const dow: Record<string, { pnl: number; n: number }> = {};
  trades.forEach(t => {
    const d = DAYS[new Date(t.date).getDay()];
    if (!dow[d]) dow[d] = { pnl: 0, n: 0 };
    dow[d].pnl += t.pnl || 0;
    dow[d].n++;
  });

  const leakTags: Record<string, number> = {};
  losses.forEach(t => {
    (t.emotional_tags || []).forEach((tag: string) => {
      leakTags[tag] = (leakTags[tag] || 0) + 1;
    });
  });

  return {
    n:   trades.length,
    wr:  +(wins.length / trades.length * 100).toFixed(1),
    pnl: +totalPnL.toFixed(2),
    pf:  grossLoss > 0 ? +(grossWin / grossLoss).toFixed(2) : 999,
    avgW: wins.length   ? +(grossWin  / wins.length).toFixed(2)  : 0,
    avgL: losses.length ? +(grossLoss / losses.length).toFixed(2) : 0,
    rr:  +(trades.reduce((s, t) => s + (t.rr || 0), 0) / trades.length).toFixed(2),
    plan: +(trades.filter(t => t.followed_plan).length / trades.length * 100).toFixed(0),
    best:  setupList[0]  || null,
    worst: setupList[setupList.length - 1] || null,
    dow,
    leaks: Object.entries(leakTags).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t),
    bigW: wins.length   ? { sym: wins.sort((a, b) => b.pnl - a.pnl)[0].symbol,   pnl: wins[0].pnl }   : null,
    bigL: losses.length ? { sym: losses.sort((a, b) => a.pnl - b.pnl)[0].symbol, pnl: losses[0].pnl } : null,
  };
};

// ── AI Generator ─────────────────────────────────────────────────────────
const generateInsight = async (payload: object, tradeCount: number): Promise<string> => {
  const resp = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `You are an elite trading performance coach analysing a trader's weekly journal. This data includes ALL trades logged this week — manual entries, broker imports, and CSV uploads.

DATA (${tradeCount} trades): ${JSON.stringify(payload)}

Write a concise but insightful weekly debrief:
1. **Edge Assessment** — profit factor + win rate verdict. Is their edge real or luck?
2. **Key Leak** — worst setup, biggest loss, emotional triggers on losing trades
3. **Psychology & Discipline** — plan adherence %, emotional states, self-sabotage patterns
4. **Session Bias** — best and worst day-of-week by P&L, timing patterns
5. **One Hard Rule** — single specific, actionable rule for next week

Clinical, data-driven, reference actual numbers. Bold headers. Under 280 words.`,
    config: { temperature: 0.65, topP: 0.9 }
  });
  return resp.text || 'Analysis unavailable.';
};

// ── Main Batch Handler ────────────────────────────────────────────────────
const handler = async () => {
  const weekKey  = getWeekKey();
  const mondayISO = getMondayISO();

  console.log(`[weekly-insights] Starting batch for ${weekKey} | trades from ${mondayISO}`);

  // 1. Get all PRO users
  const { data: proUsers, error: usersError } = await supabase
    .from('profiles')
    .select('id')
    .eq('plan', 'pro');

  if (usersError || !proUsers?.length) {
    console.log('[weekly-insights] No pro users found or error:', usersError);
    return { statusCode: 200, body: 'No pro users' };
  }

  console.log(`[weekly-insights] Processing ${proUsers.length} pro users`);

  let success = 0, skipped = 0, failed = 0;

  // 2. Process each user — rate-limited (1 req/sec to avoid Gemini quota spikes)
  for (const user of proUsers) {
    try {
      // Fetch this week's trades for the user
      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('symbol, pnl, rr, setup_type, followed_plan, emotional_tags, date, asset_type, side, narrative, mistakes, psychology, result, result_grade, tags')
        .eq('user_id', user.id)
        .gte('date', mondayISO);

      if (tradesError || !trades || trades.length < 3) {
        console.log(`[weekly-insights] Skipping user ${user.id} — ${trades?.length || 0} trades`);
        skipped++;
        continue;
      }

      // Build compact payload + generate insight
      const payload = buildPayload(trades);
      const insight = await generateInsight(payload, trades.length);

      // UPSERT — always replaces the single row, old insight gone, no storage growth
      const { error: saveError } = await supabase
        .from('profiles')
        .update({
          ai_insight_content: insight,
          ai_insight_week:    weekKey,
          ai_insight_updated: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (saveError) {
        console.error(`[weekly-insights] Save failed for ${user.id}:`, saveError);
        failed++;
      } else {
        console.log(`[weekly-insights] ✓ ${user.id} — ${trades.length} trades processed`);
        success++;
      }

      // Rate limit: 1 second between users to avoid 429s
      await new Promise(r => setTimeout(r, 1000));

    } catch (err: any) {
      console.error(`[weekly-insights] Error for ${user.id}:`, err.message);
      failed++;
      // On quota error, wait 60s before continuing
      if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        console.log('[weekly-insights] Quota hit — waiting 60s...');
        await new Promise(r => setTimeout(r, 60000));
      }
    }
  }

  const summary = `Batch complete — ${success} generated, ${skipped} skipped, ${failed} failed`;
  console.log(`[weekly-insights] ${summary}`);
  return { statusCode: 200, body: summary };
};

// Export handler for Netlify (schedule is defined in netlify.toml)
export { handler };
