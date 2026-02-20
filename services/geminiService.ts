import { GoogleGenAI } from "@google/genai";
import { Trade } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AIAnalysis {
  strengths: string[];
  weaknesses: string[];
  psychologicalProfile: string;
  actionableTip: string;
}

export const generateDailyBriefing = async (trades: Trade[]): Promise<string> => {
  // Guidelines: Application must not ask the user for API key under any circumstances.
  if (trades.length === 0) {
    return "Insufficient data for analysis. Commit more entries to unlock AI intelligence.";
  }

  // Sample the last 20 trades to stay within context limits and focus on recent performance
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
    mistakes: t.mistakes?.map(m => m.type || m.category).join(', '),
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

    // Property .text returns the extracted string output
    return response.text || "AI failed to synthesize data. Logic timeout.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "Connectivity issue with AI Terminal. Please check your network connection.";
  }
};