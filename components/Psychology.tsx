import React, { useMemo } from 'react';
import { Trade, Mistake } from '../types';
import { COLORS, ICONS } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie
} from 'recharts';

interface PsychologyProps { trades: Trade[]; }

const EMOTION_EMOJIS: Record<string, string> = {
  'Calm': '😊', 'Confident': '😎', 'Patient': '🧘', 'Disciplined': '🧠',
  'Anxious': '😰', 'Fearful': '😨', 'FOMO': '😱', 'Revenge Trading': '😡',
  'Bored': '😐', 'Excited': '🤩', 'Frustrated': '😤'
};

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

// Empty section placeholder
const EmptySection: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4 opacity-25">
    <ICONS.Psychology className="w-10 h-10" />
    <p className="text-[10px] font-black uppercase tracking-widest">{message}</p>
  </div>
);

const Psychology: React.FC<PsychologyProps> = ({ trades }) => {
  const stats = useMemo(() => {
    if (trades.length === 0) return null;

    // ── Discipline / Plan Compliance ─────────────────────────────────────
    const tradesWithPlan = trades.filter(t => t.followedPlan !== undefined || (t.plan && t.plan.length > 0));
    const followedPlan = tradesWithPlan.filter(t => t.followedPlan === true);
    const notFollowed  = tradesWithPlan.filter(t => t.followedPlan === false);

    const disciplineScore = tradesWithPlan.length > 0
      ? Math.round((followedPlan.length / tradesWithPlan.length) * 100) : 0;

    const followedPnL  = followedPlan.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const followedAvg  = followedPlan.length > 0 ? followedPnL / followedPlan.length : 0;
    const followedWR   = followedPlan.length > 0
      ? (followedPlan.filter(t => t.pnl > 0).length / followedPlan.length) * 100 : 0;

    const notFollowedPnL  = notFollowed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const notFollowedAvg  = notFollowed.length > 0 ? notFollowedPnL / notFollowed.length : 0;
    const notFollowedWR   = notFollowed.length > 0
      ? (notFollowed.filter(t => t.pnl > 0).length / notFollowed.length) * 100 : 0;

    const hasBaseline      = followedPlan.length > 0 && notFollowed.length > 0;
    const impactPerTrade   = hasBaseline ? Math.max(0, followedAvg - notFollowedAvg) : 0;
    const totalImpactValue = hasBaseline
      ? Math.max(0, (followedAvg * notFollowed.length) - notFollowedPnL) : 0;

    // ── Emotional Performance ─────────────────────────────────────────────
    const byEmotion: Record<string, { trades: Trade[]; wins: number; totalPnL: number }> = {};
    trades.forEach(t => {
      (t.psychology?.states || []).forEach(emotion => {
        if (!byEmotion[emotion]) byEmotion[emotion] = { trades: [], wins: 0, totalPnL: 0 };
        byEmotion[emotion].trades.push(t);
        if (t.pnl > 0) byEmotion[emotion].wins++;
        byEmotion[emotion].totalPnL += (Number(t.pnl) || 0);
      });
    });

    const emotionStats = Object.entries(byEmotion).map(([emotion, data]) => ({
      emotion,
      emoji:   EMOTION_EMOJIS[emotion] || '👤',
      trades:  data.trades.length,
      winRate: (data.wins / data.trades.length) * 100,
      avgPnL:  data.totalPnL / data.trades.length,
      verdict: (data.totalPnL / data.trades.length) > 0
        ? '✅ TRADE' : (data.totalPnL / data.trades.length < -50 ? '🚫 NEVER TRADE' : '🚫 DON\'T TRADE')
    })).sort((a, b) => b.avgPnL - a.avgPnL);

    const bestEmotion  = emotionStats[0] || null;
    const worstEmotion = emotionStats[emotionStats.length - 1] || null;
    const emotionalDelta = bestEmotion && worstEmotion ? (bestEmotion.avgPnL - worstEmotion.avgPnL) : 0;

    // ── Mistake Analysis ──────────────────────────────────────────────────
    const allMistakes: Mistake[] = [];
    let totalMistakeCost = 0;
    const dateMap: Record<string, number> = {};

    trades.forEach(t => {
      const day = t.date;
      if (!dateMap[day]) dateMap[day] = 0;
      (t.mistakes || []).forEach(m => {
        allMistakes.push(m);
        // estimatedCost may not exist on old Mistake type — guard safely
        totalMistakeCost += (Number((m as any).estimatedCost) || 0);
        dateMap[day]++;
      });
    });

    const categoryMap: Record<string, { count: number; cost: number; impactScores: number[] }> = {};
    const impactMapRaw: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const impactValue:  Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

    allMistakes.forEach(m => {
      // Use 'type' field (what actually exists) with 'category' as fallback
      const cat = (m as any).category || (m as any).type || 'UNCATEGORIZED';
      const imp = ((m as any).impact || 'MEDIUM') as string;
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, cost: 0, impactScores: [] };
      categoryMap[cat].count++;
      categoryMap[cat].cost += (Number((m as any).estimatedCost) || 0);
      categoryMap[cat].impactScores.push(impactValue[imp] || 2);
      if (imp in impactMapRaw) impactMapRaw[imp]++;
    });

    const frequencyData = Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgImpact: data.impactScores.reduce((a, b) => a + b, 0) / data.count,
        cost: data.cost
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // CRITICAL: Only include non-zero entries in pie chart to avoid recharts crash
    const impactDistribution = Object.entries(impactMapRaw)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0);

    const trendData = Object.keys(dateMap)
      .sort()
      .filter(d => dateMap[d] > 0)
      .map(date => ({
        date: new Date(date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        mistakes: dateMap[date]
      }));

    return {
      disciplineScore,
      tradesWithPlan: tradesWithPlan.length,
      followedPlanCount: followedPlan.length,
      notFollowedCount: notFollowed.length,
      followedPnL, followedAvg, followedWR,
      notFollowedPnL, notFollowedAvg, notFollowedWR,
      impactPerTrade, totalImpactValue,
      totalMistakes: allMistakes.length,
      totalMistakeCost, frequencyData, impactDistribution, trendData,
      mostCommon: frequencyData[0]?.name || 'None',
      emotionStats, bestEmotion, worstEmotion, emotionalDelta,
      hasMistakeData: allMistakes.length > 0,
      hasEmotionData: emotionStats.length > 0,
    };
  }, [trades]);

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-40 opacity-30 text-center animate-in fade-in duration-1000">
        <ICONS.Psychology className="w-12 h-12 grayscale mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Log trades with psychology data to unlock insights</p>
      </div>
    );
  }

  const getDisciplineFeedback = (score: number) => {
    if (score >= 85) return "Exceptional execution. You are operating like a machine. Stay focused.";
    if (score >= 70) return "Solid discipline. You're following your plan most of the time. Refine the edges.";
    if (score >= 50) return "Room for improvement. You're following your plan about half the time.";
    return "Warning: Severe behavioral drift detected. Halt trading and review your plan adherence.";
  };

  const scoreColor = stats.disciplineScore >= 80 ? 'text-emerald-500'
    : stats.disciplineScore >= 60 ? 'text-amber-500' : 'text-rose-500';

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (stats.disciplineScore / 100) * circumference;

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-700">

      {/* ── Discipline Hero ─────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="apple-glass p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] relative overflow-hidden border-white/60 ios-shadow">
          <div className="absolute right-0 top-0 p-8 opacity-5 pointer-events-none">
            <ICONS.Psychology className="w-48 h-48 sm:w-64 sm:h-64 rotate-12" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 sm:gap-10">
            {/* Discipline ring */}
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r={radius} fill="transparent" stroke="currentColor" strokeWidth="12" className="text-black/5" />
                <circle cx="80" cy="80" r={radius} fill="transparent" stroke="currentColor" strokeWidth="12"
                  strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                  className={`transition-all duration-1000 ${scoreColor}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl sm:text-4xl font-black tracking-tighter ${scoreColor}`}>{stats.disciplineScore}%</span>
                <span className="text-[7px] sm:text-[8px] font-black uppercase text-black/20 tracking-[0.2em] mt-1">Discipline</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 text-center md:text-left">
              <h2 className="text-[8px] sm:text-[10px] font-black text-black/20 uppercase tracking-[0.4em]">Behavioral Performance Score</h2>
              <p className="text-lg sm:text-2xl font-black tracking-tight text-black leading-tight max-w-xl italic">
                "{getDisciplineFeedback(stats.disciplineScore)}"
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                <div className="ceramic-white px-4 sm:px-5 py-2.5 rounded-2xl border border-black/5 shadow-sm">
                  <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Compliance Rate</p>
                  <p className="text-xs sm:text-sm font-black">{stats.followedPlanCount} / {stats.tradesWithPlan} Trades</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Plan Compliance Delta ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em] ml-2">Plan Compliance Delta</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="apple-glass p-6 rounded-[2rem] border-emerald-500/20 bg-emerald-500/[0.02]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Followed Plan</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Net Profit', val: `${stats.followedPnL >= 0 ? '+' : ''}$${Math.round(stats.followedPnL).toLocaleString()}`, color: 'text-emerald-600' },
                  { label: 'Win Rate',   val: `${stats.followedWR.toFixed(0)}%`, color: 'text-black' },
                  { label: 'Avg. Yield', val: `$${Math.round(stats.followedAvg).toLocaleString()}`, color: 'text-black' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-end">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{r.label}</span>
                    <span className={`text-sm font-black ${r.color}`}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="apple-glass p-6 rounded-[2rem] border-rose-500/20 bg-rose-500/[0.02]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[8px] font-black uppercase tracking-widest text-rose-600">Deviated</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Net Profit', val: `${stats.notFollowedPnL >= 0 ? '+' : ''}$${Math.round(stats.notFollowedPnL).toLocaleString()}`, color: 'text-rose-600' },
                  { label: 'Win Rate',   val: `${stats.notFollowedWR.toFixed(0)}%`, color: 'text-black' },
                  { label: 'Avg. Yield', val: `$${Math.round(stats.notFollowedAvg).toLocaleString()}`, color: 'text-black' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-end">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{r.label}</span>
                    <span className={`text-sm font-black ${r.color}`}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em] ml-2">Behavioral Impact Callout</h3>
          <div className="apple-glass p-8 rounded-[2rem] flex flex-col justify-center gap-6 border-white/60 min-h-[160px]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <ICONS.Target className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Execution Edge</p>
                <p className="text-base font-black text-black leading-snug">Following your plan adds <span className="text-emerald-600">${Math.round(stats.impactPerTrade).toLocaleString()}</span> to your average trade yield.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                <ICONS.Dollar className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Opportunity Leak</p>
                <p className="text-base font-black text-black leading-snug">You left <span className="text-rose-600">${Math.round(stats.totalImpactValue).toLocaleString()}</span> on the table by deviating from your rules.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Friction Analysis (Mistakes) ────────────────────────────────── */}
      <section className="space-y-8 pt-4">
        <div className="space-y-1 px-2">
          <h3 className="text-xl sm:text-2xl font-black text-black tracking-tighter uppercase leading-none">Friction Analysis</h3>
          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Error Pattern Recognition</p>
        </div>

        {!stats.hasMistakeData ? (
          <div className="apple-glass p-10 rounded-[2.5rem] border-white/60">
            <EmptySection message="No mistake data logged yet — add mistakes when reviewing trades" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Trend */}
            {stats.trendData.length > 0 && (
              <section className="lg:col-span-12">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 ml-2 flex items-center gap-2.5">
                  <div className="w-1 h-3.5 bg-rose-500 rounded-full" /> Occurrence Trend
                </h3>
                <div className="apple-glass p-5 sm:p-8 rounded-[2.5rem] ios-shadow border-white h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="mistakeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={COLORS.MISTAKES.HIGH} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={COLORS.MISTAKES.HIGH} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.4} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700, fontSize: 8 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700, fontSize: 8 }} />
                      <Tooltip cursor={false} content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="mistakes" stroke={COLORS.MISTAKES.HIGH} strokeWidth={2.5} fillOpacity={1} fill="url(#mistakeGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Bar + Pie side by side */}
            <section className="lg:col-span-8">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 ml-2 flex items-center gap-2.5">
                <div className="w-1 h-3.5 bg-black rounded-full" /> Peak Friction Leak
              </h3>
              <div className="apple-glass p-5 sm:p-8 rounded-[2.5rem] ios-shadow border-white h-[320px]">
                {stats.frequencyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={stats.frequencyData} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" opacity={0.4} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#000', fontWeight: 800, fontSize: 9 }} width={100} />
                      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={28}>
                        {stats.frequencyData.map((entry: any, index: number) => {
                          let fill = COLORS.MISTAKES.LOW;
                          if (entry.avgImpact > 3.5) fill = COLORS.MISTAKES.CRITICAL;
                          else if (entry.avgImpact > 2.5) fill = COLORS.MISTAKES.HIGH;
                          else if (entry.avgImpact > 1.5) fill = COLORS.MISTAKES.MEDIUM;
                          return <Cell key={`cell-${index}`} fill={fill} fillOpacity={0.9} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptySection message="No categorized mistakes yet" />}
              </div>
            </section>

            <section className="lg:col-span-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 ml-2 flex items-center gap-2.5">
                <div className="w-1 h-3.5 bg-amber-500 rounded-full" /> Intensity Split
              </h3>
              <div className="apple-glass p-5 sm:p-8 rounded-[2.5rem] ios-shadow border-white h-[320px] flex flex-col items-center justify-center">
                {stats.impactDistribution.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="70%">
                      <PieChart>
                        <Pie
                          isAnimationActive={false}
                          data={stats.impactDistribution}
                          innerRadius={50} outerRadius={80}
                          paddingAngle={4} dataKey="value"
                        >
                          {stats.impactDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS.MISTAKES[entry.name as keyof typeof COLORS.MISTAKES] || '#94a3b8'} />
                          ))}
                        </Pie>
                        <Tooltip cursor={false} content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3">
                      {stats.impactDistribution.map(lvl => (
                        <div key={lvl.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS.MISTAKES[lvl.name as keyof typeof COLORS.MISTAKES] }} />
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{lvl.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <EmptySection message="No impact data" />}
              </div>
            </section>
          </div>
        )}
      </section>

      {/* ── Emotional Intelligence ───────────────────────────────────────── */}
      <section className="space-y-8 pt-4">
        <div className="space-y-1 px-2">
          <h3 className="text-xl sm:text-2xl font-black text-black tracking-tighter uppercase leading-none">Emotional Intelligence</h3>
          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Internal State Performance Analysis</p>
        </div>

        {!stats.hasEmotionData ? (
          <div className="apple-glass p-10 rounded-[2.5rem] border-white/60">
            <EmptySection message="Log emotional states in trades to unlock this section" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Emotion table */}
              <section className="lg:col-span-7">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 ml-2 flex items-center gap-2.5">
                  <div className="w-1 h-3.5 bg-violet-500 rounded-full" /> Performance Matrix
                </h3>
                <div className="apple-glass rounded-[2rem] border-white overflow-hidden overflow-x-auto no-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-black/5 text-[8px] font-black uppercase tracking-widest text-black/40">
                      <tr>
                        <th className="px-6 py-4">Emotion</th>
                        <th className="px-6 py-4">Trades</th>
                        <th className="px-6 py-4">WR%</th>
                        <th className="px-6 py-4">Avg P&L</th>
                        <th className="px-6 py-4">Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {stats.emotionStats.map(e => (
                        <tr key={e.emotion} className="hover:bg-black/[0.02] transition-colors">
                          <td className="px-6 py-4 text-xs font-black text-black flex items-center gap-2 whitespace-nowrap">
                            <span className="text-lg leading-none">{e.emoji}</span>{e.emotion}
                          </td>
                          <td className="px-6 py-4 text-[11px] font-bold text-black/60">{e.trades}</td>
                          <td className="px-6 py-4 text-[11px] font-bold text-black/60">{e.winRate.toFixed(0)}%</td>
                          <td className={`px-6 py-4 text-[11px] font-black ${e.avgPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {e.avgPnL >= 0 ? '+' : '−'}${Math.abs(Math.round(e.avgPnL)).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[8px] font-black px-2 py-1 rounded-full whitespace-nowrap ${e.verdict.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                              {e.verdict}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Emotion chart */}
              <section className="lg:col-span-5">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 ml-2 flex items-center gap-2.5">
                  <div className="w-1 h-3.5 bg-black rounded-full" /> Average Yield by State
                </h3>
                <div className="apple-glass p-5 sm:p-8 rounded-[2rem] ios-shadow border-white h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.emotionStats} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" opacity={0.4} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="emotion" type="category" axisLine={false} tickLine={false} tick={{ fill: '#000', fontWeight: 800, fontSize: 9 }} width={100} />
                      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} content={<CustomTooltip prefix="$" />} />
                      <Bar dataKey="avgPnL" radius={[0, 6, 6, 0]} barSize={22} isAnimationActive={false}>
                        {stats.emotionStats.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.avgPnL >= 0 ? COLORS.WIN : COLORS.LOSS} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            {/* Traffic lights */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              <div className="apple-glass p-8 rounded-[2rem] border-emerald-500/20 bg-emerald-500/[0.02] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Green Light Protocol</h4>
                </div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Trade when feeling:</p>
                <ul className="space-y-3">
                  {['Calm', 'Confident', 'Patient', 'Disciplined'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-xs font-black text-black italic">
                      <span className="text-base">{EMOTION_EMOJIS[item] || '👤'}</span>{item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="apple-glass p-8 rounded-[2rem] border-rose-500/20 bg-rose-500/[0.02] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                  <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Red Light Hardstop</h4>
                </div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Never trade when:</p>
                <ul className="space-y-3">
                  {['Revenge Trading', 'FOMO', 'Anxious', 'Frustrated'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-xs font-black text-black italic">
                      <span className="text-base">{EMOTION_EMOJIS[item] || '👤'}</span>{item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="apple-glass p-8 rounded-[2rem] border-violet-500/20 bg-violet-500/[0.02] flex flex-col justify-center space-y-6">
                <div className="flex items-center gap-3">
                  <ICONS.Insights className="w-4 h-4 text-violet-500" />
                  <h4 className="text-[10px] font-black text-violet-600 uppercase tracking-[0.2em]">State Bias Insight</h4>
                </div>
                {stats.bestEmotion && stats.worstEmotion ? (
                  <div className="space-y-4">
                    <p className="text-sm font-black text-black leading-tight italic">
                      "When <span className="text-emerald-600">{stats.bestEmotion.emotion}</span>, you make <span className="text-emerald-600">${Math.round(stats.bestEmotion.avgPnL)}</span> per trade.
                      When <span className="text-rose-600">{stats.worstEmotion.emotion}</span>, you lose <span className="text-rose-600">${Math.abs(Math.round(stats.worstEmotion.avgPnL))}</span>."
                    </p>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opportunity Gap</span>
                      <p className="text-2xl font-black text-black tracking-tighter">${Math.round(stats.emotionalDelta).toLocaleString()}</p>
                      <p className="text-[8px] font-bold text-black/30 uppercase tracking-[0.2em]">Per execution variance</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-black/20 italic">Maintain psychological journaling to unlock behavioral arbitrage insights.</p>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default Psychology;
