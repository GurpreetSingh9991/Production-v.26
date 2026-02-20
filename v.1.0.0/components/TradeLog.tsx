import React, { useState, useMemo, useEffect } from 'react';
import { Trade, Side, Result, PerformanceUnit, Mistake, Execution } from '../types';
import { ICONS, TRADER_QUOTES } from '../constants';
import { exportToCSV } from '../services/storage';

const MOOD_EMOJIS = ['☹️', '🙁', '😐', '🙂', '😊'];

interface TradeLogProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  displayUnit: PerformanceUnit;
}

const TradeLog: React.FC<TradeLogProps> = ({ trades, onEdit, onDelete, displayUnit }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const randomQuote = useMemo(() => TRADER_QUOTES[Math.floor(Math.random() * TRADER_QUOTES.length)], []);

  useEffect(() => {
    if (confirmDeleteId) {
      const timer = setTimeout(() => setConfirmDeleteId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmDeleteId]);

  // Calculate unique tags and their counts
  const tagStats = useMemo(() => {
    const counts: Record<string, number> = {};
    trades.forEach(t => {
      t.tags?.forEach(tag => {
        const trimmed = tag.trim();
        if (trimmed) counts[trimmed] = (counts[trimmed] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [trades]);

  const filteredSortedTrades = useMemo(() => {
    let result = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (selectedTag) {
      result = result.filter(t => t.tags?.map(tag => tag.trim()).includes(selectedTag));
    }
    return result;
  }, [trades, selectedTag]);

  const getImageUrl = (link: string) => {
    if (!link || typeof link !== 'string') return '';
    const tvMatch = link.match(/(?:tradingview\.com\/x\/|s3\.tradingview\.com\/snapshots\/\w\/)(\w+)/);
    if (tvMatch && tvMatch[1]) {
      const id = tvMatch[1];
      const firstLetter = id.charAt(0).toLowerCase();
      return `https://s3.tradingview.com/snapshots/${firstLetter}/${id}.png`;
    }
    return link;
  };

  const handleTriggerDelete = (id: string) => {
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  const formatPnL = (trade: Trade) => {
    switch (displayUnit) {
      case 'PERCENT':
        return `${trade.pnl >= 0 ? '+' : ''}${((trade.pnl / 10000) * 100).toFixed(2)}%`; 
      case 'R_MULTIPLE':
        return `${trade.rr}R`;
      case 'TICKS':
        const ticks = (Math.abs(trade.exitPrice - trade.entryPrice)) * (trade.multiplier || 1);
        return `${trade.pnl >= 0 ? '+' : '-'}${ticks.toFixed(1)} Tks`;
      case 'CURRENCY':
      default:
        return `${trade.pnl >= 0 ? '+' : ''}$${Math.abs(trade.pnl).toLocaleString()}`;
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="apple-glass p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] ios-shadow border-white relative overflow-hidden group">
        <ICONS.Quote className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 text-black/[0.03] rotate-12 group-hover:scale-110 transition-all duration-1000" />
        <div className="relative z-10 space-y-3 sm:space-y-4 max-w-2xl">
          <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-black/20">The Wisdom Path</h3>
          <p className="text-lg sm:text-2xl font-black italic tracking-tighter text-black/80 leading-tight">
            "{randomQuote.text}"
          </p>
          <div className="flex items-center gap-3">
             <div className="w-6 h-[2px] bg-black/10 rounded-full" />
             <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-black/40">{randomQuote.author}</p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="space-y-3 sm:space-y-4 px-1">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[9px] sm:text-[10px] font-black text-black/20 uppercase tracking-[0.3em] flex items-center gap-2">
            <div className="w-1 h-3 bg-black/20 rounded-full" /> Narrative Scopes
          </h3>
          <div className="flex items-center gap-4">
            <p className="hidden sm:block text-[8px] font-black text-black/30 uppercase tracking-widest">
              {filteredSortedTrades.length} Hits
            </p>
            <button 
              onClick={() => exportToCSV(trades)}
              className="flex items-center gap-2 px-3 py-1.5 bg-black/[0.03] hover:bg-black hover:text-white rounded-full text-[8px] font-black uppercase tracking-widest transition-all border border-black/5"
            >
              <ICONS.Export className="w-3 h-3" />
              Export Library
            </button>
          </div>
        </div>
        
        <div className="relative">
          {/* Masked scroll container */}
          <div className="flex items-center gap-2 overflow-x-auto touch-scroll pb-2 no-scrollbar px-2">
            <button 
              onClick={() => setSelectedTag(null)}
              className={`px-4 sm:px-5 py-2 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                !selectedTag ? 'bg-black text-white border-black shadow-lg' : 'bg-white/40 text-black/40 border-white/60'
              }`}
            >
              Overall ({trades.length})
            </button>
            {tagStats.map(([tag, count]) => (
              <button 
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-4 sm:px-5 py-2 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-2 ${
                  selectedTag === tag ? 'bg-black text-white border-black shadow-lg' : 'bg-white/40 text-black/40 border-white/60'
                }`}
              >
                {tag} 
                <span className={`text-[7px] ${selectedTag === tag ? 'text-white/40' : 'text-black/20'}`}>{count}</span>
              </button>
            ))}
          </div>
          <div className="absolute top-0 right-0 bottom-2 w-12 bg-gradient-to-l from-[#D6D6D6] to-transparent pointer-events-none" />
        </div>
      </div>

      <div className="space-y-4 min-h-[300px]">
        {filteredSortedTrades.map((trade) => (
          <div key={trade.id} className="apple-glass rounded-[2rem] sm:rounded-[2.2rem] overflow-hidden group hover:border-black/20 transition-all duration-300 ios-shadow list-item-optimized animate-reagle">
            <div className="flex items-stretch min-h-[72px] sm:min-h-[80px]">
              <div 
                className="flex-1 p-4 sm:p-6 cursor-pointer hover:bg-white/40 transition-colors flex items-center justify-between"
                onClick={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
              >
                <div className="flex items-center gap-3 sm:gap-5">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-[9px] sm:text-[10px] border flex-shrink-0 ${
                    trade.side === 'LONG' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600' : 'bg-rose-500/5 border-rose-500/10 text-rose-600'
                  } shadow-sm`}>
                    {trade.side[0]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] sm:text-sm font-black text-black tracking-tight uppercase flex items-center gap-1.5 truncate">
                      {trade.symbol}
                      {trade.mistakes && trade.mistakes.length > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      )}
                    </h4>
                    <p className="text-[10px] text-black opacity-30 font-black mt-0.5 truncate uppercase tracking-widest">{trade.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6">
                  <p className={`text-[11px] sm:text-sm font-black font-mono ${trade.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatPnL(trade)}
                  </p>
                  <ICONS.ToggleRight className={`w-3.5 h-3.5 text-black opacity-20 transition-transform duration-500 ${expandedId === trade.id ? 'rotate-90 opacity-100' : ''}`} />
                </div>
              </div>

              {/* Mobile quick actions are inside the accordion, but desktop has a rail */}
              <div className="hidden md:flex items-center gap-1 px-4 border-l border-slate-100 bg-white/40">
                <button onClick={(e) => { e.stopPropagation(); onEdit(trade); }} className="p-3 text-black opacity-40 hover:opacity-100 transition-opacity hover:bg-white rounded-xl"><ICONS.Edit className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); handleTriggerDelete(trade.id); }} className={`p-3 transition-all duration-300 rounded-xl flex items-center gap-2 ${confirmDeleteId === trade.id ? 'bg-rose-500 text-white shadow-lg opacity-100' : 'text-black opacity-40 hover:text-rose-600'}`}>
                  <ICONS.Delete className="w-4 h-4" />
                  {confirmDeleteId === trade.id && <span className="text-[8px] font-black uppercase tracking-widest">OK?</span>}
                </button>
              </div>
            </div>

            {expandedId === trade.id && (
              <div className="p-5 sm:p-10 bg-black/[0.01] border-t border-slate-100 animate-in slide-in-from-top-2 duration-500">
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                    <div className="lg:col-span-7 space-y-6 sm:space-y-8">
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <StatTile label="Asset" value={trade.assetType} color="cyan" />
                          <StatTile label="Size" value={trade.qty.toString()} color="white" />
                          <StatTile label="Yield" value={`${trade.rr}R`} color="white" />
                          <StatTile label="Net" value={`$${trade.pnl.toLocaleString()}`} color={trade.pnl >= 0 ? 'emerald' : 'rose'} />
                       </div>

                       {/* Timeline Seq for Mobile */}
                       {trade.executions && trade.executions.length > 0 && (
                         <div className="space-y-3">
                            <h5 className="text-[9px] font-black text-black/20 uppercase tracking-widest ml-1">Timeline Sequence</h5>
                            <div className="ceramic-white rounded-2xl sm:rounded-[2rem] border border-black/5 overflow-x-auto no-scrollbar">
                               <table className="w-full text-left min-w-[300px]">
                                  <thead className="bg-black/[0.03] text-[7px] font-black uppercase tracking-widest">
                                     <tr>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Price</th>
                                        <th className="px-4 py-3">Qty</th>
                                        <th className="px-4 py-3">Time</th>
                                     </tr>
                                  </thead>
                                  <tbody className="divide-y divide-black/5">
                                     {trade.executions.map((exec) => (
                                        <tr key={exec.id} className="text-[10px] sm:text-xs font-bold">
                                           <td className={`px-4 py-3 ${exec.type === 'ENTRY' ? 'text-emerald-500' : 'text-rose-500'}`}>{exec.type}</td>
                                           <td className="px-4 py-3">${exec.price.toLocaleString()}</td>
                                           <td className="px-4 py-3">{exec.qty}</td>
                                           <td className="px-4 py-3 text-black/30 font-mono">{exec.time}</td>
                                        </tr>
                                     ))}
                                  </tbody>
                               </table>
                            </div>
                         </div>
                       )}

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                          {trade.mistakes && trade.mistakes.length > 0 && (
                            <div className="space-y-3">
                               <h5 className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                                  <div className="w-1 h-3 bg-rose-500 rounded-full" /> Friction Leak
                               </h5>
                               <div className="space-y-2">
                                  {trade.mistakes.map((mistake, i) => (
                                    <div key={i} className="bg-rose-500/[0.03] border border-rose-500/10 rounded-[1.5rem] p-4">
                                       <span className="text-[7px] font-black uppercase text-rose-500">{mistake.type}</span>
                                       <p className="text-[11px] font-semibold italic text-slate-500 mt-1 leading-snug">"{mistake.lesson}"</p>
                                    </div>
                                  ))}
                               </div>
                            </div>
                          )}

                          {trade.psychology && (
                            <div className="space-y-3">
                               <h5 className="text-[9px] font-black text-violet-500/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                                  <div className="w-1 h-3 bg-violet-500 rounded-full" /> Biometrics
                               </h5>
                               <div className="bg-violet-500/[0.03] border border-violet-500/10 rounded-[1.5rem] p-4 flex flex-col items-center gap-3">
                                  <div className="flex items-center gap-6">
                                     <div className="text-center">
                                        <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-1">Pre</p>
                                        <span className="text-xl">{MOOD_EMOJIS[(trade.psychology.moodBefore || 3) - 1]}</span>
                                     </div>
                                     <ICONS.ChevronRight className="w-3 h-3 text-violet-200" />
                                     <div className="text-center">
                                        <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-1">Post</p>
                                        <span className="text-xl">{MOOD_EMOJIS[(trade.psychology.moodAfter || 3) - 1]}</span>
                                     </div>
                                  </div>
                                  <div className="flex flex-wrap justify-center gap-1.5">
                                     {(trade.psychology.states || []).map(state => (
                                       <span key={state} className="px-2 py-0.5 bg-violet-500/10 text-violet-600 text-[7px] font-black uppercase tracking-widest rounded-full">
                                          {state}
                                       </span>
                                     ))}
                                  </div>
                               </div>
                            </div>
                          )}
                       </div>

                       <div className="bg-white/40 p-5 rounded-[1.8rem] border border-white/60">
                          <h5 className="text-[9px] font-black text-black/30 uppercase tracking-widest mb-2 flex items-center gap-2">Narrative Context</h5>
                          <p className="text-black text-[12px] leading-relaxed italic font-semibold">{trade.narrative || "System logs empty."}</p>
                       </div>
                    </div>
                    
                    <div className="lg:col-span-5">
                       <h5 className="text-[9px] font-black text-black/30 uppercase tracking-widest mb-4 flex items-center gap-2">Execution Proof</h5>
                       {trade.chartLink ? (
                         <div className="rounded-[2rem] border border-white overflow-hidden bg-slate-50 aspect-video lg:aspect-square ios-shadow relative group">
                            <img src={getImageUrl(trade.chartLink)} alt="Proof" className="w-full h-full object-cover" loading="lazy" />
                            <a href={trade.chartLink} target="_blank" rel="noopener noreferrer" className="absolute top-3 right-3 p-3 bg-white/80 backdrop-blur-md rounded-xl text-black shadow-lg"><ICONS.External className="w-4 h-4" /></a>
                         </div>
                       ) : (
                         <div className="rounded-[2rem] border-dashed border-slate-200 bg-slate-100/50 aspect-video lg:aspect-square flex flex-col items-center justify-center opacity-20 gap-3">
                            <ICONS.Logo className="w-8 h-8" />
                            <p className="text-[9px] font-black uppercase tracking-widest">No chart linked</p>
                         </div>
                       )}
                    </div>
                 </div>

                 {/* Mobile Quick Actions Area */}
                 <div className="mt-8 pt-6 border-t border-black/5 flex flex-col gap-3 lg:hidden">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(trade); }} className="w-full flex items-center justify-center gap-2 py-4 bg-white/60 border border-slate-200 rounded-2xl text-[9px] font-black uppercase tracking-widest text-black active:scale-95 transition-all">
                      <ICONS.Edit className="w-4 h-4 opacity-40" /> Edit Execution
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleTriggerDelete(trade.id); }} className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${confirmDeleteId === trade.id ? 'bg-rose-600 text-white animate-pulse' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'}`}>
                      <ICONS.Delete className="w-4 h-4" /> {confirmDeleteId === trade.id ? 'Confirm Deletion' : 'Delete Entry'}
                    </button>
                 </div>
              </div>
            )}
          </div>
        ))}
        {filteredSortedTrades.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 animate-in fade-in duration-700">
            <ICONS.Journal className="w-12 h-12 mb-4" />
            <h4 className="text-sm font-black uppercase tracking-widest">No results found</h4>
            <p className="text-[10px] font-bold mt-2">Adjust your scope or reset filters.</p>
            <button 
              onClick={() => setSelectedTag(null)}
              className="mt-6 px-6 py-3 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-xl"
            >
              Reset Protocol
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const StatTile = ({ label, value, color = 'slate' }: { label: string, value: string, color?: string }) => {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-600',
    purple: 'text-violet-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    white: 'text-black'
  };
  return (
    <div className="ceramic-white p-3 sm:p-4 rounded-2xl border border-black/5 shadow-sm">
      <p className="text-[7px] sm:text-[8px] font-black text-black/30 uppercase tracking-widest mb-1 truncate">{label}</p>
      <p className={`text-[10px] sm:text-xs font-black truncate uppercase ${colorMap[color]}`}>{value}</p>
    </div>
  );
};

export default TradeLog;