import React, { useState, useEffect } from 'react';
import { Trade } from '../types';
import { ICONS } from '../constants';
import { generateDailyBriefing } from '../services/geminiService';

interface AIPageProps {
  trades: Trade[];
}

interface CachedInsight {
  date: string;
  content: string;
}

const AIPage: React.FC<AIPageProps> = ({ trades }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);

  useEffect(() => {
    const checkCache = () => {
      const today = new Date().toDateString();
      const cached = localStorage.getItem('tf_daily_insight');
      
      if (cached) {
        try {
          const parsed: CachedInsight = JSON.parse(cached);
          if (parsed.date === today) {
            setInsight(parsed.content);
            setCanRefresh(false);
            return;
          }
        } catch (e) {
          localStorage.removeItem('tf_daily_insight');
        }
      }
      setCanRefresh(true);
    };

    checkCache();
  }, []);

  const handleGenerate = async () => {
    if (trades.length < 3) {
      alert("Not enough data.\n\nAI Intelligence needs at least 3 logged trades to identify patterns. Add more trades and try again.");
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
      alert("AI synthesis failed.\n\nCheck that your GEMINI_API_KEY is set correctly in your environment variables.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Protocol Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-black tracking-tighter uppercase leading-none">Cognitive Terminal</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Daily Performance Synthesis</p>
        </div>
        
        <div className="flex bg-white/40 backdrop-blur-xl border border-white/60 rounded-full px-5 py-2.5 items-center gap-4 shadow-sm">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest text-black/60">Core: Gemini 3</span>
           </div>
           <div className="w-px h-3 bg-black/10" />
           <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase tracking-widest text-black/60">Limit: 1/Day</span>
           </div>
        </div>
      </div>

      {/* Main Report Area */}
      <div className="bg-white/80 backdrop-blur-3xl rounded-2xl border border-white/40 shadow-2xl overflow-hidden min-h-[500px] flex flex-col relative">
        {/* Abstract Background Detail */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
             <div className="relative">
                <div className="w-20 h-20 border-[6px] border-violet-500/10 border-t-violet-600 rounded-full animate-spin" />
                <ICONS.AIIntelligence className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-violet-600 animate-pulse" />
             </div>
             <div className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-black">Decrypting Session Logs</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-[250px]">Gemini is parsing behavior patterns and statistical drift...</p>
             </div>
          </div>
        ) : insight ? (
          <div className="flex-1 p-8 md:p-14 animate-in slide-in-from-bottom-4 duration-1000">
            <div className="prose prose-sm max-w-none 
              prose-p:text-[14px] prose-p:font-medium prose-p:leading-relaxed prose-p:text-slate-700 
              prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-black
              prose-h3:text-[11px] prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-violet-600
              prose-strong:text-black prose-strong:font-black
              prose-li:text-[14px] prose-li:font-medium prose-li:text-slate-600">
              <div dangerouslySetInnerHTML={{ __html: formatMarkdown(insight) }} />
            </div>
            
            <div className="mt-12 pt-12 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4 opacity-30">
               <div className="flex items-center gap-3">
                  <ICONS.Logo className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">TradeFlow Audit v1.0 • Session Encrypted</span>
               </div>
               <span className="text-[9px] font-black uppercase tracking-widest">Report Refreshes at 00:00 Local</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8">
             <div className="w-24 h-24 bg-black/[0.03] rounded-2xl flex items-center justify-center">
                <ICONS.AIIntelligence className="w-10 h-10 text-black/10" />
             </div>
             <div className="max-w-sm space-y-3">
                <h3 className="text-lg font-black uppercase tracking-tight text-black">Intelligence Lockdown</h3>
                <p className="text-xs font-semibold text-slate-400 leading-relaxed italic">
                  Today's session data is pending analysis. Every 24 hours, the AI Core resets to synthesize your latest executions.
                </p>
             </div>
             <button 
               onClick={handleGenerate}
               className="group relative px-10 py-5 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-[0.3em] overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl"
             >
                <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 flex items-center gap-3">
                  Initiate Daily Synthesis <ICONS.Zap className="w-4 h-4 text-amber-400" />
                </span>
             </button>
          </div>
        )}
      </div>

      {/* Disclaimer / Protocol Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <ProtocolCard 
            icon={<ICONS.Eye className="w-4 h-4" />} 
            title="Bias Detection" 
            desc="Gemini monitors your emotional states vs yield to find hidden leak triggers."
         />
         <ProtocolCard 
            icon={<ICONS.Target className="w-4 h-4" />} 
            title="Pattern Audit" 
            desc="Recognition of setup variants that yield consistently higher expectancy."
         />
         <ProtocolCard 
            icon={<ICONS.Zap className="w-4 h-4" />} 
            title="Protocol Lock" 
            desc="To prevent over-analysis, reports are strictly capped at one per calendar day."
         />
      </div>
    </div>
  );
};

const ProtocolCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="apple-glass p-6 rounded-2xl border-white/60 space-y-3">
     <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center text-black/40">{icon}</div>
     <h4 className="text-[10px] font-black uppercase tracking-widest text-black">{title}</h4>
     <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">{desc}</p>
  </div>
);

// Improved Markdown formatter for high-fidelity report
const formatMarkdown = (text: string) => {
  return text
    .replace(/^### (.*$)/gim, '<h3 className="mt-8 mb-4 flex items-center gap-3"><div className="w-1 h-3 bg-violet-600 rounded-full" /> $1</h3>')
    .replace(/^## (.*$)/gim, '<h2 className="text-xl font-black mb-6 mt-10">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 className="text-2xl font-black mb-8 border-b border-black/5 pb-4">$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li className="ml-2 mb-2">$1</li>')
    .replace(/\n/gim, '<br />');
};

export default AIPage;