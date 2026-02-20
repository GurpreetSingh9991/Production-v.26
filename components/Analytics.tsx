import React, { useMemo, useState } from 'react';
import { Trade, SetupType, Bias } from '../types';
import { SETUP_TYPES, BIASES, COLORS, ICONS } from '../constants';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Legend,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface AnalyticsProps {
  trades: Trade[];
}

const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="apple-glass p-3 rounded-2xl border border-white shadow-2xl">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
        {payload.map((item: any, index: number) => {
          if (!item) return null;
          return (
            <div key={index} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <p className="text-xs font-black text-black">
                {item.name}: {prefix}{item.value?.toLocaleString() || 0}{suffix}
              </p>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const getSession = (time: string) => {
  if (!time) return 'Unknown';
  const [hourStr, minStr] = time.split(':');
  const hour = parseInt(hourStr);
  const minutes = parseInt(minStr);
  
  if (hour < 9 || (hour === 9 && minutes < 30)) return 'Pre-Market';
  if (hour < 11) return 'Open';
  if (hour < 14) return 'Mid-Day';
  if (hour < 16) return 'Power Hour';
  return 'After Hours';
};

const Analytics: React.FC<AnalyticsProps> = ({ trades }) => {
  const [rollingWindow, setRollingWindow] = useState<7 | 30>(7);

  const analysis = useMemo(() => {
    if (trades.length === 0) return null;

    const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // 1. Enhanced Day of Week Logic
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats = dayNames.map((day, idx) => {
      const dayTrades = trades.filter(t => new Date(t.date + 'T12:00:00').getDay() === idx);
      const wins = dayTrades.filter(t => t.pnl > 0).length;
      const totalPnL = dayTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
      return {
        name: day.substring(0, 3),
        fullName: day,
        trades: dayTrades.length,
        winRate: dayTrades.length > 0 ? (wins / dayTrades.length) * 100 : 0,
        totalPnL: parseFloat(totalPnL.toFixed(2)),
        avgPnL: dayTrades.length > 0 ? totalPnL / dayTrades.length : 0
      };
    }).filter(d => d.trades > 0 || !['Sunday', 'Saturday'].includes(d.fullName));

    // 2. Intraday Session Logic
    const sessionNames = ['Pre-Market', 'Open', 'Mid-Day', 'Power Hour', 'After Hours'];
    const sessionStats = sessionNames.map(session => {
      const sessionTrades = trades.filter(t => getSession(t.entryTime) === session);
      const wins = sessionTrades.filter(t => t.pnl > 0).length;
      const totalPnL = sessionTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
      return {
        name: session,
        trades: sessionTrades.length,
        winRate: sessionTrades.length > 0 ? (wins / sessionTrades.length) * 100 : 0,
        totalPnL: parseFloat(totalPnL.toFixed(2)),
        avgPnL: sessionTrades.length > 0 ? totalPnL / sessionTrades.length : 0
      };
    });

    // Temporal Insights
    const bestDay = [...dayStats].sort((a, b) => b.avgPnL - a.avgPnL)[0];
    const worstDay = [...dayStats].sort((a, b) => a.avgPnL - b.avgPnL)[0];
    const bestSession = [...sessionStats].sort((a, b) => b.avgPnL - a.avgPnL)[0];
    const worstSession = [...sessionStats].sort((a, b) => a.avgPnL - b.avgPnL)[0];

    // Setup Performance Logic
    const setupMetrics = SETUP_TYPES.map(setup => {
      const setupTrades = trades.filter(t => t.setupType === setup);
      if (setupTrades.length === 0) return { setup, trades: 0, winRate: 0, totalPnL: 0, avgPnL: 0, profitFactor: 0 };
      
      const wins = setupTrades.filter(t => t.pnl > 0);
      const losses = setupTrades.filter(t => t.pnl < 0);
      
      const totalPnL = setupTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
      const winRate = (wins.length / setupTrades.length) * 100;
      const avgPnL = totalPnL / setupTrades.length;
      
      const grossWins = wins.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
      const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0));
      const profitFactor = grossLoss > 0 ? (grossWins / grossLoss) : (grossWins > 0 ? 99 : 0);
      
      return {
        setup,
        trades: setupTrades.length,
        winRate: parseFloat(winRate.toFixed(1)),
        totalPnL: parseFloat(totalPnL.toFixed(2)),
        avgPnL: parseFloat(avgPnL.toFixed(2)),
        profitFactor: parseFloat(profitFactor.toFixed(2))
      };
    });

    const bestSetup = [...setupMetrics].sort((a, b) => b.totalPnL - a.totalPnL)[0];
    const worstSetup = [...setupMetrics].sort((a, b) => a.totalPnL - b.totalPnL)[0];

    // Grade Performance
    const uniqueGrades = Array.from(new Set(trades.map(t => String(t.resultGrade || 'B').toUpperCase()))).sort();
    const gradePerformance = uniqueGrades.map(grade => {
      const gradeTrades = trades.filter(t => String(t.resultGrade || '').toUpperCase().trim() === grade);
      const total = gradeTrades.length;
      if (total === 0) return null;
      const wins = gradeTrades.filter(t => t.result === 'WIN').length;
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      return { name: grade, winRate: parseFloat(winRate.toFixed(1)) };
    }).filter(Boolean);

    const biasPerformance = BIASES.map(bias => {
      const biasTrades = trades.filter(t => t.weeklyBias === bias);
      return { name: bias, value: biasTrades.length };
    }).filter(t => t.value > 0);

    let cumulativePnL = 0;
    const trendData = sortedTrades.map((trade, index) => {
      cumulativePnL += (Number(trade.pnl) || 0);
      const startIdx = Math.max(0, index - rollingWindow + 1);
      const windowTrades = sortedTrades.slice(startIdx, index + 1);
      const windowWins = windowTrades.filter(t => t.result === 'WIN').length;
      const rollingWinRate = windowTrades.length > 0 ? (windowWins / windowTrades.length) * 100 : 0;

      return {
        date: new Date(trade.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        equity: parseFloat(cumulativePnL.toFixed(2)),
        rollingWR: parseFloat(rollingWinRate.toFixed(1))
      };
    });

    return { 
      gradePerformance, 
      biasPerformance, 
      trendData, 
      dayStats, 
      sessionStats, 
      bestDay, 
      worstDay, 
      bestSession, 
      worstSession,
      setupMetrics, 
      bestSetup, 
      worstSetup 
    };
  }, [trades, rollingWindow]);

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-40 opacity-30 text-center animate-in fade-in duration-1000">
        <ICONS.Logo className="w-12 h-12 grayscale mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">No Data Available</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-700">
      
      {/* 1. Intelligence Hub (Equity Trend) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 px-2">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-black tracking-tighter uppercase leading-none">Intelligence Hub</h3>
            <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Equity Momentum</p>
          </div>
          <div className="flex bg-white/40 p-1 rounded-full border border-white/60 shadow-sm overflow-hidden">
            {[7, 30].map((period) => (
              <button
                key={period}
                onClick={() => setRollingWindow(period as 7 | 30)}
                className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-full text-[8px] sm:text-[9px] font-black tracking-widest uppercase transition-all duration-300 ${
                  rollingWindow === period ? 'bg-black text-white' : 'text-slate-400 hover:text-black'
                }`}
              >
                {period} SES
              </button>
            ))}
          </div>
        </div>

        <div className="apple-glass p-4 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-white h-[280px] sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analysis.trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.PRIMARY} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={COLORS.PRIMARY} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#000" opacity={0.05} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700, fontSize: 7 }} dy={8} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700, fontSize: 7 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Area isAnimationActive={false} yAxisId="left" name="equity" type="monotone" dataKey="equity" stroke={COLORS.PRIMARY} strokeWidth={2} fillOpacity={1} fill="url(#equityGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 2. Temporal Edge & Session Dynamics (NEW SECTION) */}
      <section className="space-y-6">
        <div className="px-2">
          <h3 className="text-lg sm:text-xl font-black text-black tracking-tighter uppercase leading-none">Temporal Edge & Session Dynamics</h3>
          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Time-Based Probability Analysis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Day of Week Analysis */}
          <div className="space-y-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
                <div className="w-1 h-3 bg-black rounded-full" /> Day of Week Alpha
             </h3>
             <div className="apple-glass p-5 rounded-[2.2rem] space-y-6">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysis.dayStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#000" opacity={0.05} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#000', fontWeight: 800, fontSize: 9 }} />
                      <Tooltip cursor={false} content={<CustomTooltip prefix="$" />} />
                      <Bar dataKey="totalPnL" radius={[4, 4, 4, 4]}>
                        {analysis.dayStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.totalPnL >= 0 ? COLORS.WIN : COLORS.LOSS} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                   <table className="w-full text-left text-[10px]">
                      <thead className="text-slate-400 font-black uppercase tracking-widest border-b border-black/5">
                        <tr>
                          <th className="pb-3 px-2">Day</th>
                          <th className="pb-3 px-2">Trades</th>
                          <th className="pb-3 px-2">WR%</th>
                          <th className="pb-3 px-2">Avg P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {analysis.dayStats.map((d) => (
                          <tr key={d.name} className="hover:bg-black/[0.02]">
                            <td className="py-2.5 px-2 font-black">{d.fullName}</td>
                            <td className="py-2.5 px-2 font-bold opacity-40">{d.trades}</td>
                            <td className="py-2.5 px-2 font-black">{d.winRate.toFixed(0)}%</td>
                            <td className={`py-2.5 px-2 font-black ${d.avgPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              ${Math.abs(Math.round(d.avgPnL))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>

          {/* Intraday Session Analysis */}
          <div className="space-y-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
                <div className="w-1 h-3 bg-violet-500 rounded-full" /> Intraday Session Edge
             </h3>
             <div className="apple-glass p-5 rounded-[2.2rem] space-y-6">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={analysis.sessionStats}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#000" opacity={0.05} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#000', fontWeight: 800, fontSize: 8 }} width={70} />
                      <Tooltip cursor={false} content={<CustomTooltip prefix="$" />} />
                      <Bar dataKey="totalPnL" radius={[0, 4, 4, 0]}>
                        {analysis.sessionStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.totalPnL >= 0 ? '#8B5CF6' : COLORS.LOSS} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                   <table className="w-full text-left text-[10px]">
                      <thead className="text-slate-400 font-black uppercase tracking-widest border-b border-black/5">
                        <tr>
                          <th className="pb-3 px-2">Session</th>
                          <th className="pb-3 px-2">Trades</th>
                          <th className="pb-3 px-2">WR%</th>
                          <th className="pb-3 px-2">Avg P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {analysis.sessionStats.map((s) => (
                          <tr key={s.name} className="hover:bg-black/[0.02]">
                            <td className="py-2.5 px-2 font-black">{s.name}</td>
                            <td className="py-2.5 px-2 font-bold opacity-40">{s.trades}</td>
                            <td className="py-2.5 px-2 font-black">{s.winRate.toFixed(0)}%</td>
                            <td className={`py-2.5 px-2 font-black ${s.avgPnL >= 0 ? 'text-violet-600' : 'text-rose-600'}`}>
                              ${Math.abs(Math.round(s.avgPnL))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        </div>

        {/* Strategic Guidance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="apple-glass p-6 rounded-[2rem] border-emerald-500/10 bg-emerald-500/[0.02] flex flex-col justify-between">
            <div>
               <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-4">
                  <ICONS.Calendar className="w-4 h-4" />
               </div>
               <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Peak Day Alpha</h4>
               <p className="text-sm font-black text-black leading-tight italic">"{analysis.bestDay.fullName} is your highest-yield session."</p>
            </div>
            <p className="text-[8px] font-bold text-black/40 mt-4 uppercase tracking-widest">Strategy: Increase Size</p>
          </div>

          <div className="apple-glass p-6 rounded-[2rem] border-rose-500/10 bg-rose-500/[0.02] flex flex-col justify-between">
            <div>
               <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 mb-4">
                  <ICONS.Target className="w-4 h-4" />
               </div>
               <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Session Drawdown</h4>
               <p className="text-sm font-black text-black leading-tight italic">"Skip {analysis.worstDay.fullName} trading protocols."</p>
            </div>
            <p className="text-[8px] font-bold text-black/40 mt-4 uppercase tracking-widest">Strategy: Omit Session</p>
          </div>

          <div className="apple-glass p-6 rounded-[2rem] border-violet-500/10 bg-violet-500/[0.02] flex flex-col justify-between">
            <div>
               <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 mb-4">
                  <ICONS.Clock className="w-4 h-4" />
               </div>
               <h4 className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1">Intraday Optimal</h4>
               <p className="text-sm font-black text-black leading-tight italic">"Market {analysis.bestSession.name} shows peak edge."</p>
            </div>
            <p className="text-[8px] font-bold text-black/40 mt-4 uppercase tracking-widest">Strategy: Focus Window</p>
          </div>

          <div className="apple-glass p-6 rounded-[2rem] border-amber-500/10 bg-amber-500/[0.02] flex flex-col justify-between">
            <div>
               <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-4">
                  <ICONS.Info className="w-4 h-4" />
               </div>
               <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Skip Consideration</h4>
               <p className="text-sm font-black text-black leading-tight italic">"{analysis.worstSession.name} yields negative expectancy."</p>
            </div>
            <p className="text-[8px] font-bold text-black/40 mt-4 uppercase tracking-widest">Strategy: Tighten Filters</p>
          </div>
        </div>
      </section>

      {/* 3. Setup Yield Matrix */}
      <section className="space-y-6">
        <div className="px-2">
          <h3 className="text-lg sm:text-xl font-black text-black tracking-tighter uppercase leading-none">Setup Yield Matrix</h3>
          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Strategy Performance Breakdown</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="apple-glass p-4 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-white h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.setupMetrics} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#000" opacity={0.05} />
                  <XAxis dataKey="setup" axisLine={false} tickLine={false} tick={{ fill: '#000', fontWeight: 800, fontSize: 9 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700, fontSize: 7 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip cursor={false} content={<CustomTooltip prefix="$" />} />
                  <Bar isAnimationActive={false} dataKey="totalPnL" radius={[4, 4, 4, 4]} barSize={40}>
                    {analysis.setupMetrics.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.totalPnL >= 0 ? COLORS.WIN : COLORS.LOSS} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="apple-glass rounded-[2rem] sm:rounded-[2.5rem] border-white overflow-hidden overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-black/5 text-[9px] font-black uppercase tracking-widest text-black/40">
                    <th className="px-6 py-4">Setup</th>
                    <th className="px-6 py-4">Trades</th>
                    <th className="px-6 py-4">Win Rate</th>
                    <th className="px-6 py-4">Total P&L</th>
                    <th className="px-6 py-4">Avg P&L</th>
                    <th className="px-6 py-4">P. Factor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {analysis.setupMetrics.map((m) => (
                    <tr key={m.setup} className="hover:bg-black/[0.02] transition-colors">
                      <td className="px-6 py-4 text-xs font-black text-black">Setup {m.setup}</td>
                      <td className="px-6 py-4 text-[11px] font-bold text-black/60">{m.trades}</td>
                      <td className="px-6 py-4 text-[11px] font-bold text-black/60">{m.winRate}%</td>
                      <td className={`px-6 py-4 text-[11px] font-black ${m.totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.totalPnL >= 0 ? '+' : '-'}${Math.abs(m.totalPnL).toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 text-[11px] font-black ${m.avgPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.avgPnL >= 0 ? '+' : '-'}${Math.abs(m.avgPnL).toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 text-[11px] font-black ${m.profitFactor > 1.5 ? 'text-emerald-600' : m.profitFactor >= 1.0 ? 'text-amber-500' : 'text-rose-600'}`}>
                        {m.profitFactor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="apple-glass p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-white space-y-6">
               <h3 className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em] flex items-center gap-2">
                 <div className="w-1 h-3 bg-black/20 rounded-full" /> Execution Insights
               </h3>
               
               <div className="space-y-4">
                  <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-[1.5rem] space-y-2">
                     <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Champion Logic</span>
                     <p className="text-xs font-black text-black leading-tight">Setup {analysis.bestSetup.setup} is your primary yield engine with ${analysis.bestSetup.totalPnL.toLocaleString()} net profit.</p>
                     <p className="text-[9px] font-bold text-black/40 italic">Strategy: Scale exposure on these variants.</p>
                  </div>

                  <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-[1.5rem] space-y-2">
                     <span className="text-[8px] font-black uppercase text-rose-600 tracking-widest">Protocol Leak</span>
                     <p className="text-xs font-black text-black leading-tight">
                        {analysis.worstSetup.totalPnL < 0 
                          ? `Halt operations for Setup ${analysis.worstSetup.setup}. It has leaked $${Math.abs(analysis.worstSetup.totalPnL).toLocaleString()} capital.`
                          : `Setup ${analysis.worstSetup.setup} is your lowest efficiency variant.`}
                     </p>
                     <p className="text-[9px] font-bold text-black/40 italic">Strategy: Tighten risk filters or omit.</p>
                  </div>

                  <div className="p-5 bg-black/[0.03] border border-black/5 rounded-[1.5rem] space-y-3">
                     <span className="text-[8px] font-black uppercase text-black/40 tracking-widest">Action Items</span>
                     <ul className="space-y-1.5">
                        <li className="flex items-center gap-2 text-[10px] font-bold text-black/60">
                           <div className="w-1 h-1 rounded-full bg-black/20" /> Review Setup {analysis.bestSetup.setup} chart proofs
                        </li>
                        <li className="flex items-center gap-2 text-[10px] font-bold text-black/60">
                           <div className="w-1 h-1 rounded-full bg-black/20" /> Audit Setup {analysis.worstSetup.setup} mistakes
                        </li>
                        <li className="flex items-center gap-2 text-[10px] font-bold text-black/60">
                           <div className="w-1 h-1 rounded-full bg-black/20" /> Optimize RR for type {analysis.setupMetrics[0].setup}
                        </li>
                     </ul>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8">
          <h3 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2 flex items-center gap-2">
             <div className="w-1 h-3 bg-black rounded-full" /> Quality Profile
          </h3>
          <div className="apple-glass p-4 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-white h-[300px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.gradePerformance} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#000" opacity={0.05} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#000', fontWeight: 800, fontSize: 9 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700, fontSize: 7 }} />
                <Tooltip cursor={false} content={<CustomTooltip suffix="%" />} />
                <Bar isAnimationActive={false} dataKey="winRate" radius={[4, 4, 4, 4]} barSize={32}>
                  {analysis.gradePerformance.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.winRate >= 50 ? COLORS.WIN : COLORS.LOSS} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-4">
          <h3 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2 flex items-center gap-2">
             <div className="w-1 h-3 bg-amber-500 rounded-full" /> Context Split
          </h3>
          <div className="apple-glass p-4 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-white h-[300px] sm:h-[350px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie isAnimationActive={false} data={analysis.biasPerformance} innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                  {analysis.biasPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'UP' ? COLORS.WIN : entry.name === 'DOWN' ? COLORS.LOSS : COLORS.BE} />
                  ))}
                </Pie>
                <Tooltip cursor={false} content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={6} formatter={(v) => <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Analytics;