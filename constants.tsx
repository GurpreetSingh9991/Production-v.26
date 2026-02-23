import { GoogleGenAI } from "@google/genai";
import { Trade } from "../types";

// ── API Key Resolution ─────────────────────────────────────────────────────
const resolveKey = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY)
    return import.meta.env.VITE_GEMINI_API_KEY;
  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY)
    return process.env.GEMINI_API_KEY;
  if (typeof process !== 'undefined' && process.env?.API_KEY)
    return process.env.API_KEY;
  return '';
};

const apiKey = resolveKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// ── Token-Optimised Trade Summariser ──────────────────────────────────────
// Instead of sending raw trade objects (expensive), we pre-compute stats
// and send a compact structured payload. Reduces tokens by ~70%.

export interface WeeklyPayload {
  weekRange: string;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  avgRR: number;
  bestSetup: { name: string; winRate: number; count: number } | null;
  worstSetup: { name: string; winRate: number; count: number } | null;
  planAdherence: number;           // % of trades where followedPlan = true
  emotionalLeaks: string[];        // top emotional tags on losing trades
  dayOfWeekBias: Record<string, { pnl: number; count: number }>;
  biggestWin: { symbol: string; pnl: number; setup: string };
  biggestLoss: { symbol: string; pnl: number; setup: string };
  recentMistakes: string[];        // last 5 mistake types logged
  symbolBreakdown: { symbol: string; pnl: number; trades: number }[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const buildWeeklyPayload = (trades: Trade[]): WeeklyPayload => {
  if (!trades.length) throw new Error('No trades');

  const sorted = [...trades].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const wins  = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const totalPnL = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const grossWin  = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  // Setup breakdown
  const setups: Record<string, { wins: number; total: number }> = {};
  trades.forEach(t => {
    const k = t.setupType || 'Unknown';
    if (!setups[k]) setups[k] = { wins: 0, total: 0 };
    setups[k].total++;
    if (t.pnl > 0) setups[k].wins++;
  });
  const setupList = Object.entries(setups)
    .map(([name, s]) => ({ name, winRate: s.total ? (s.wins / s.total) * 100 : 0, count: s.total }))
    .sort((a, b) => b.winRate - a.winRate);

  // Day of week
  const dow: Record<string, { pnl: number; count: number }> = {};
  trades.forEach(t => {
    const day = DAYS[new Date(t.date).getDay()];
    if (!dow[day]) dow[day] = { pnl: 0, count: 0 };
    dow[day].pnl += t.pnl || 0;
    dow[day].count++;
  });

  // Emotional tags on losing trades only
  const leakTags: Record<string, number> = {};
  losses.forEach(t => {
    (t.emotionalTags || t.psychology?.states || []).forEach((tag: string) => {
      leakTags[tag] = (leakTags[tag] || 0) + 1;
    });
  });
  const emotionalLeaks = Object.entries(leakTags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag);

  // Mistakes
  const mistakes: string[] = [];
  trades.slice(-10).forEach(t => {
    (t.mistakes || []).forEach((m: any) => {
      const label = m.type || m.category || m;
      if (label && !mistakes.includes(label)) mistakes.push(label);
    });
  });

  // Symbol breakdown (top 5)
  const symbols: Record<string, { pnl: number; trades: number }> = {};
  trades.forEach(t => {
    if (!symbols[t.symbol]) symbols[t.symbol] = { pnl: 0, trades: 0 };
    symbols[t.symbol].pnl += t.pnl || 0;
    symbols[t.symbol].trades++;
  });
  const symbolBreakdown = Object.entries(symbols)
    .map(([symbol, v]) => ({ symbol, ...v }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 5);

  const biggestWin  = wins.sort((a, b) => b.pnl - a.pnl)[0];
  const biggestLoss = losses.sort((a, b) => a.pnl - b.pnl)[0];

  const firstDate = sorted[0]?.date;
  const lastDate  = sorted[sorted.length - 1]?.date;

  return {
    weekRange:       `${firstDate} → ${lastDate}`,
    totalTrades:     trades.length,
    winRate:         wins.length / trades.length * 100,
    totalPnL,
    avgWin:          wins.length  ? grossWin  / wins.length  : 0,
    avgLoss:         losses.length ? grossLoss / losses.length : 0,
    profitFactor:    grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0,
    avgRR:           trades.reduce((s, t) => s + (t.rr || 0), 0) / trades.length,
    bestSetup:       setupList[0] || null,
    worstSetup:      setupList[setupList.length - 1] || null,
    planAdherence:   trades.filter(t => t.followedPlan).length / trades.length * 100,
    emotionalLeaks,
    dayOfWeekBias:   dow,
    biggestWin:      biggestWin  ? { symbol: biggestWin.symbol,  pnl: biggestWin.pnl,  setup: biggestWin.setupType  || '' } : { symbol: '-', pnl: 0, setup: '' },
    biggestLoss:     biggestLoss ? { symbol: biggestLoss.symbol, pnl: biggestLoss.pnl, setup: biggestLoss.setupType || '' } : { symbol: '-', pnl: 0, setup: '' },
    recentMistakes:  mistakes.slice(0, 5),
    symbolBreakdown,
  };
};

// ── ISO Week Key Helper ────────────────────────────────────────────────────
// Returns e.g. "2025-W08" for the current trading week.
// We use Friday as the "end of week" trigger — insights unlock Friday–Sunday.
export const getCurrentWeekKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
};

export const isEndOfTradingWeek = (): boolean => {
  const day = new Date().getDay(); // 0=Sun, 5=Fri, 6=Sat
  return day === 5 || day === 6 || day === 0; // Fri / Sat / Sun
};

export const getNextFriday = (): string => {
  const now = new Date();
  const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  return friday.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

// ── Main Weekly Briefing Generator ────────────────────────────────────────
export const generateWeeklyBriefing = async (trades: Trade[]): Promise<string> => {
  if (!ai) {
    return "⚠️ AI Terminal offline. Set VITE_GEMINI_API_KEY in your Netlify environment variables.";
  }
  if (trades.length < 3) {
    return "Insufficient data. Log at least 3 trades this week to unlock AI analysis.";
  }

  let payload: WeeklyPayload;
  try {
    payload = buildWeeklyPayload(trades);
  } catch {
    return "Could not process trade data for analysis.";
  }

  // Compact JSON — much smaller than raw trades (~200 tokens vs ~2000)
  const compactPayload = JSON.stringify(payload, null, 0);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are an elite trading performance coach delivering a weekly performance review.

TRADER STATS THIS WEEK:
${compactPayload}

Write a focused weekly debrief covering:
1. **Edge Assessment** — Is their strategy producing a positive expectancy? Cite the profit factor and win rate directly.
2. **Leak Identification** — What is costing them money? Reference their worst setup, emotional leak tags, and biggest loss specifically.
3. **Psychological Pattern** — What does their plan adherence % and emotional tags reveal about their trading psychology this week?
4. **Day/Symbol Bias** — Flag any day-of-week or symbol where they are consistently losing.
5. **One Hard Rule** — A single, specific, actionable rule to implement next week based on their data.

Use bold headers. Be direct, data-driven, and clinical. Under 300 words. Reference their actual numbers.`,
      config: { temperature: 0.65, topP: 0.9 }
    });

    return response.text || "AI failed to synthesize weekly data.";
  } catch (error: any) {
    console.error("Gemini Weekly Error:", error);
    const msg = error?.message || JSON.stringify(error) || '';

    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      return "⏱️ AI quota reached. Your weekly insight will be available shortly — quota resets every minute. Try again in 60 seconds.";
    }
    if (msg.includes('403') || msg.includes('401') || msg.includes('API key')) {
      return "🔑 API key issue. Check VITE_GEMINI_API_KEY in Netlify environment variables.";
    }
    return "⚠️ AI Terminal temporarily unavailable. Please try again in a few minutes.";
  }
};
