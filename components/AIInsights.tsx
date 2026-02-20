import React, { useState, useEffect } from 'react';
import { Trade } from '../types';
import { ICONS } from '../constants';
import { generateDailyBriefing } from '../services/geminiService';

interface AIInsightsProps {
  trades: Trade[];
}

interface CachedInsight {
  date: string;
  content: string;
}

const AIInsights: React.FC<AIInsightsProps> = ({ trades }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);

  useEffect(() => {
    const checkCache = () => {
      const today = new Date().toDateString();
      const cached = localStorage.getItem('tf_daily_insight');
      
      if (cached) {
        const parsed: CachedInsight = JSON.parse(cached);
        if (parsed.date === today) {
          setInsight(parsed.content);
          setCanRefresh(false);
          return;
        }
      }
      setCanRefresh(true);
    };

    checkCache();
  }, []);

  const handleGenerate = async () => {
    if (trades.length < 3) {
      alert("AI requires at least 3 trades to generate meaningful patterns.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateDailyBriefing(trades);
      const today = new Date().toDateString();
      const cacheData: CachedInsight = { date: today, content: result };
      
      localStorage.setItem('tf_daily_insight', JSON.stringify(cacheData));
      setInsight(result);
      setCanRefresh(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="apple-glass rounded-[2.5rem] p-6 sm:p-8 border-white/60 ios-shadow overflow-hidden relative group">
      {/* Decorative AI Pulse */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl group-hover:bg-violet-500/10 transition-all duration-1000" />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <ICONS.Psychology className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em]">Cognitive Terminal</h3>
            <h2 className="text-sm font-black text-black uppercase tracking-tight">AI Daily Intelligence</h2>
          </div>
        </div>

        {canRefresh && !isLoading && (
          <button 
            onClick={handleGenerate}
            className="px-5 py-2.5 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <ICONS.Zap className="w-3 h-3 text-amber-400" /> Unlock Insights
          </button>
        )}
      </div>

      <div className="relative z-10 min-h-[120px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 gap-4">
            <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-[9px] font-black text-violet-600 uppercase tracking-[0.3em] animate-pulse">Scanning Protocol Logs...</p>
          </div>
        ) : insight ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="prose prose-sm max-w-none prose-p:text-[12px] prose-p:font-semibold prose-p:leading-relaxed prose-p:text-slate-600 prose-headings:text-[10px] prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-black prose-strong:text-violet-600 prose-li:text-[12px] prose-li:font-medium">
              <div dangerouslySetInnerHTML={{ __html: formatMarkdown(insight) }} />
            </div>
            {!canRefresh && (
              <div className="flex items-center gap-2 pt-4 opacity-30">
                <ICONS.Clock className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-widest">Protocol lock: Insight refreshes in 24h</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30 text-center">
            {/* Fix: Property 'BrainCircuit' does not exist on type 'ICONS'. Replaced with ICONS.Psychology which maps to the BrainCircuit icon. */}
            <ICONS.Psychology className="w-12 h-12 mb-4" />
            <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-[200px]">
              Daily intelligence locked. Click generate to analyze session data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Markdown formatter for the clean text output
const formatMarkdown = (text: string) => {
  return text
    .replace(/^### (.*$)/gim, '<h3 className="mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h4 className="mt-4 mb-2">$1</h4>')
    .replace(/^# (.*$)/gim, '<h2 className="mt-4 mb-2">$1</h2>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li className="ml-4 mb-1">$1</li>')
    .replace(/\n/gim, '<br />');
};

export default AIInsights;