import { GoogleGenAI } from "@google/genai";
import { Trade } from "../types";

// ── API Key Resolution ─────────────────────────────────────────────────────
// Vite exposes VITE_* env vars to the browser via import.meta.env.
// Netlify: set VITE_GEMINI_API_KEY in Site Settings → Environment Variables.
// Local dev: add VITE_GEMINI_API_KEY=your_key to .env.local
const resolveKey = (): string => {
  // Primary: Vite import.meta.env (works in both dev and Netlify production builds)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  // Fallback: process.env injected by vite.config define (legacy support)
  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

const apiKey = resolveKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface AIAnalysis {
  strengths: string[];
  weaknesses: string[];
  psychologicalProfile: string;
  actionableTip: string;
}

export const generateDailyBriefing = async (trades: Trade[]): Promise<string> => {
  if (!ai) {
    return "⚠️ AI Terminal offline. Set VITE_GEMINI_API_KEY in your Netlify environment variables to activate.";
  }

  if (trades.length === 0) {
    return "Insufficient data for analysis. Commit more entries to unlock AI intelligence.";
  }

  const recentTrades = trades
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  const dataSummary = recentTrades.map(t => ({
    symbol: t.symbol,
    result: t.result,
    pnl: t.pnl,
    rr: t.rr,
    setup: t.setupType,
    followedPlan: t.followedPlan,
    mistakes: t.mistakes?.map((m: any) => m.type || m.category).join(', '),
    mood: t.psychology?.states?.join(', ')
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are a world-class trading performance coach. Analyze the following trade data from the user's last 20 trades and provide a concise daily briefing.
      
      Data: ${JSON.stringify(dataSummary)}

      Focus on:
      1. Pattern recognition in losses (is there a common mistake or time?).
      2. Execution quality (plan compliance vs profitability).
      3. Psychological bias detection based on their mood logs.
      4. One specific "Hard Rule" for them to follow in their next session.

      Format the response in clear Markdown with bold headers. Use professional, clinical, yet encouraging language. Keep it under 250 words.`,
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    return response.text || "AI failed to synthesize data. Logic timeout.";
  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    // Surface the actual error so it's easier to debug
    const msg = error?.message || '';
    if (msg.includes('API_KEY') || msg.includes('API key') || msg.includes('403')) {
      return "🔑 AI Terminal: Invalid or missing API key. Check VITE_GEMINI_API_KEY in Netlify environment variables.";
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('CORS')) {
      return "🌐 AI Terminal: Network error. The Gemini API may be blocked by your network or browser.";
    }
    return `⚠️ AI Terminal error: ${msg || 'Unknown error. Check browser console for details.'}`;
  }
};
