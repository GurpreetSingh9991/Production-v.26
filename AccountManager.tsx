import React, { useMemo, useState } from 'react';
import { Trade, Account, PerformanceUnit } from '../types';
import { ICONS } from '../constants';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import TradeCalendar from './TradeCalendar';

type DateRange = 'ALL' | 'TODAY' | '7D' | '30D' | 'MTD' | 'YTD';

interface DashboardProps {
  trades: Trade[];
  activeAccount?: Account;
  accounts: Account[];
  onTradeEdit: (trade: Trade) => void;
  onTradeDelete: (id: string) => void;
  userName?: string;
  displayUnit: PerformanceUnit;
  setDisplayUnit: (unit: PerformanceUnit) => void;
}

interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  icon: React.ReactNode;
  title: string;
  message: string;
  priority: number; // Higher is more urgent
}

// Memoized KPI Box for performance
const KPIBox = React.memo(({ label, value, subtext, pill, color, tooltip }: any) => (
  <div 
    className="apple-glass p-4 sm:p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 overflow-hidden cursor-default"
    title={tooltip}
  >
    <div className="flex items-center justify-between mb-2 sm:mb-4">
      <h4 className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-black/40 truncate pr-1">{label}</h4>
      {pill && (
        <span className={`px-1.5 py-0.5 rounded-full text-[7px] sm:text-[8px] font-black tracking-widest flex-shrink-0 ${
          pill === 'WIN' || pill === 'GOOD' ? 'bg-emerald-500/10 text-emerald-600' : 
          pill === 'DD' || pill === 'RISK' ? 'bg-rose-500/10 text-rose-600' : 'bg-black/5 text-black/40'
        }`}>
          {pill}
        </span>
      )}
    </div>
    <div className="overflow-hidden">
       <p className={`text-lg sm:text-2xl font-black tracking-tight truncate ${color === 'rose' ? 'text-rose-600' : color === 'emerald' ? 'text-emerald-600' : color === 'amber' ? 'text-amber-500' : 'text-black'}`}>
         {value}
       </p>
       <p className="text-[8px] sm:text-[10px] font-bold text-black/20 uppercase tracking-widest mt-0.5 truncate">{subtext}</p>
    </div>
  </div>
));

const Dashboard: React.FC<DashboardProps> = ({ trades, activeAccount, accounts, onTradeEdit, onTradeDelete, displayUnit }) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange>('ALL');

  const startingEquity = useMemo(() => activeAccount 
    ? activeAccount.initialBalance 
    : accounts.reduce((sum, a) => sum + a.initialBalance, 0), [activeAccount, accounts]);

  const filteredByDateTrades = useMemo(() => {
    if (dateRange === 'ALL') return trades;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    return trades.filter(t => {
      const tradeDate = new Date(t.date + 'T12:00:00').getTime();
      
      switch (dateRange) {
        case 'TODAY':
          return tradeDate === today;
        case '7D':
          return tradeDate >= today - (7 * 24 * 60 * 60 * 1000);
        case '30D':
          return tradeDate >= today - (30 * 24 * 60 * 60 * 1000);
        case 'MTD':
          return new Date(tradeDate).getMonth() === now.getMonth() && new Date(tradeDate).getFullYear() === now.getFullYear();
        case 'YTD':
          return new Date(tradeDate).getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }, [trades, dateRange]);

  const stats = useMemo(() => {
    const currentTrades = filteredByDateTrades;
    if (!currentTrades || currentTrades.length === 0) return null;
    
    const sortedTrades = [...currentTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const winTrades = currentTrades.filter(t => t.pnl > 0);
    const lossTrades = currentTrades.filter(t => t.pnl < 0);
    const winRate = (winTrades.length / currentTrades.length) * 100 || 0;
    
    const totalNetPnL = currentTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
    const avgPnL = totalNetPnL / currentTrades.length;

    const formatValue = (pnl: number, trade?: Trade) => {
      switch (displayUnit) {
        case 'PERCENT': return startingEquity > 0 ? (pnl / startingEquity) * 100 : 0;
        case 'R_MULTIPLE': return trade ? trade.rr : (pnl / Math.abs(avgPnL || 1));
        case 'TICKS':
          if (trade) return (Math.abs(trade.exitPrice - trade.entryPrice)) * (trade.multiplier || 1);
          return pnl;
        default: return pnl;
      }
    };

    const getUnitLabel = () => {
      switch (displayUnit) {
        case 'PERCENT': return '%';
        case 'R_MULTIPLE': return 'R';
        case 'TICKS': return ' Tks';
        default: return '$';
      }
    };

    // Advanced Stats Calculations
    const grossProfit = winTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 99.99 : 0);
    
    const avgWin = winTrades.length > 0 ? (grossProfit / winTrades.length) : 0;
    const avgLoss = lossTrades.length > 0 ? (grossLoss / lossTrades.length) : 0;
    const expectancyRaw = ((winTrades.length / currentTrades.length) * avgWin) - ((lossTrades.length / currentTrades.length) * avgLoss);
    const expectancy = formatValue(expectancyRaw);

    const sortedTradesDesc = [...currentTrades].sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.entryTime || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.entryTime || '00:00'}`).getTime();
      return timeB - timeA;
    });

    let streakCount = 0;
    let streakType: 'WIN' | 'LOSS' | 'BE' | 'NONE' = 'NONE';
    if (sortedTradesDesc.length > 0) {
      streakType = sortedTradesDesc[0].result;
      for (const t of sortedTradesDesc) {
        if (t.result === streakType) streakCount++;
        else break;
      }
    }

    // Max Drawdown Logic
    let peak = startingEquity || 0;
    let currentEq = startingEquity || 0;
    let maxDrawdownPct = 0;
    for (const t of sortedTrades) {
      currentEq += (Number(t.pnl) || 0);
      if (currentEq > peak) peak = currentEq;
      const dd = peak > 0 ? ((peak - currentEq) / peak) * 100 : 0;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    }

    // Best Setup Logic
    const setups: Record<string, { wins: number, total: number }> = {};
    currentTrades.forEach(t => {
      if (!setups[t.setupType]) setups[t.setupType] = { wins: 0, total: 0 };
      setups[t.setupType].total++;
      if (t.pnl > 0) setups[t.setupType].wins++;
    });
    const bestSetupEntry = Object.entries(setups)
      .map(([name, s]) => ({ name, winRate: (s.wins / s.total) * 100 }))
      .sort((a, b) => b.winRate - a.winRate)[0];

    // Discipline Logic (followedPlan)
    const followedPlanCount = currentTrades.filter(t => t.followedPlan === true).length;
    const disciplineScore = currentTrades.length > 0 ? (followedPlanCount / currentTrades.length) * 100 : 0;

    let cumulative = displayUnit === 'CURRENCY' ? (startingEquity || 0) : 0;
    const equityData = sortedTrades.map((t) => {
      const val = formatValue(t.pnl, t);
      cumulative += val;
      return { value: cumulative, date: t.date, pnl: val };
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pnlByDay = days.map((day, idx) => {
      const dayPnL = currentTrades
        .filter(t => new Date(t.date + 'T12:00:00').getDay() === idx)
        .reduce((sum, t) => sum + formatValue(t.pnl, t), 0);
      return { name: day, pnl: dayPnL };
    });

    // Generate Alerts
    const activeAlerts: Alert[] = [];
    
    if (maxDrawdownPct > 15) {
      activeAlerts.push({
        id: 'max-dd',
        type: 'danger',
        icon: <ICONS.Info className="w-4 h-4" />,
        title: `Drawdown Alert: ${maxDrawdownPct.toFixed(1)}%`,
        message: 'Your capital exposure is reaching critical levels. Review position sizing protocols.',
        priority: 10
      });
    }

    if (streakType === 'LOSS' && streakCount >= 3) {
      activeAlerts.push({
        id: 'loss-streak',
        type: 'danger',
        icon: <ICONS.Target className="w-4 h-4" />,
        title: `${streakCount}-Trade Loss Streak`,
        message: 'Operational drift detected. Halt trading and audit previous executions.',
        priority: 9
      });
    }

    if (disciplineScore < 70 && currentTrades.length >= 5) {
      activeAlerts.push({
        id: 'discipline-dip',
        type: 'warning',
        icon: <ICONS.Eye className="w-4 h-4" />,
        title: `Low Discipline: ${disciplineScore.toFixed(0)}%`,
        message: 'Protocol deviations are increasing. Reinforce plan adherence.',
        priority: 5
      });
    }

    if (streakType === 'WIN' && streakCount >= 4) {
      activeAlerts.push({
        id: 'win-streak',
        type: 'success',
        icon: <ICONS.Trending className="w-4 h-4" />,
        title: `${streakCount}-Trade Win Streak`,
        message: 'Peak operational flow. Maintain process stability without overconfidence.',
        priority: 4
      });
    }

    if (bestSetupEntry && bestSetupEntry.winRate > 65 && setups[bestSetupEntry.name].total >= 3) {
      activeAlerts.push({
        id: 'best-setup',
        type: 'info',
        icon: <ICONS.Zap className="w-4 h-4" />,
        title: `Edge Found: Setup ${bestSetupEntry.name}`,
        message: `Your win rate is ${bestSetupEntry.winRate.toFixed(0)}% on this variant. Focus resources here.`,
        priority: 3
      });
    }

    return { 
      total: currentTrades.length, 
      wins: winTrades.length, 
      losses: lossTrades.length, 
      winRate, 
      totalNetPnL: formatValue(totalNetPnL), 
      avgPnL: formatValue(avgPnL), 
      profitFactor,
      expectancy,
      equityData, pnlByDay,
      currentBalance: cumulative,
      streakCount, streakType,
      unitLabel: getUnitLabel(),
      activeAlerts: activeAlerts.sort((a, b) => b.priority - a.priority).slice(0, 3)
    };
  }, [filteredByDateTrades, activeAccount, accounts, displayUnit, startingEquity]);

  const renderTradeDetail = (trade: Trade) => {
    let displayPnL = trade.pnl;
    let prefix = trade.pnl >= 0 ? '+' : '';
    let suffix = '';

    if (displayUnit === 'PERCENT') {
        displayPnL = startingEquity > 0 ? (trade.pnl / startingEquity) * 100 : 0;
        suffix = '%';
    } else if (displayUnit === 'R_MULTIPLE') {
        displayPnL = trade.rr;
        suffix = 'R';
    } else if (displayUnit === 'TICKS') {
        displayPnL = (Math.abs(trade.exitPrice - trade.entryPrice)) * (trade.multiplier || 1);
        suffix = ' Tks';
    } else {
        prefix = trade.pnl >= 0 ? '+$' : '-$';
        displayPnL = Math.abs(trade.pnl);
    }

    return (
      <div key={trade.id} className="bg-white/40 border border-white/60 rounded-2xl p-4 sm:p-5 mb-3 sm:mb-4 hover:shadow-lg transition-all animate-reagle list-item-optimized">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-black text-[9px] sm:text-[10px] ${trade.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {trade.side[0]}
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold tracking-tight">{trade.symbol}</h4>
              <p className="text-[9px] sm:text-[10px] font-bold text-black/20 uppercase tracking-widest">{trade.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <span className={`text-xs sm:text-sm font-black font-mono ${trade.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {prefix}{displayPnL.toLocaleString(undefined, { maximumFractionDigits: 2 })}{suffix}
            </span>
            <button onClick={() => onTradeEdit(trade)} className="text-black/20 hover:text-black transition-colors"><ICONS.Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
          </div>
        </div>
      </div>
    );
  };

  const visibleAlerts = useMemo(() => {
    return stats?.activeAlerts.filter(a => !dismissedAlerts.has(a.id)) || [];
  }, [stats?.activeAlerts, dismissedAlerts]);

  return (
    <div className="space-y-8 sm:space-y-12 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl sm:text-2xl font-black tracking-tighter leading-none">
            {activeAccount?.name || 'Overall Performance'}
          </h2>
        </div>
        
        <div className="flex items-center gap-1 bg-black/5 p-1 rounded-full overflow-x-auto no-scrollbar">
          {(['ALL', 'TODAY', '7D', '30D', 'MTD', 'YTD'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                dateRange === range ? 'bg-black text-white shadow-md' : 'text-black/40 hover:text-black hover:bg-black/5'
              }`}
            >
              {range === 'ALL' ? 'All Time' : range === 'TODAY' ? 'Today' : range}
            </button>
          ))}
        </div>
      </div>

      {!stats ? (
        <div className="apple-glass p-20 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4 border border-black/5">
          <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center text-black/20">
            <ICONS.Journal className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">No Activity Detected</h3>
            <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mt-1">
              {dateRange === 'ALL' ? 'Start by adding your first trade' : `No trades recorded for ${dateRange === 'TODAY' ? 'today' : 'this period'}`}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-6 sm:space-y-8">
            {/* Row 1: Primary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <KPIBox label={displayUnit === 'CURRENCY' ? "Balance" : "Return"} value={`${displayUnit === 'CURRENCY' ? '$' : ''}${stats.currentBalance.toLocaleString(undefined, { maximumFractionDigits: 1 })}${displayUnit !== 'CURRENCY' ? stats.unitLabel : ''}`} subtext="Current liquidity" color="black" />
              <KPIBox label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} subtext={`${stats.wins} wins recorded`} color="black" />
              <KPIBox label="Avg Reward" value={`${displayUnit === 'CURRENCY' ? '$' : ''}${stats.avgPnL.toLocaleString(undefined, { maximumFractionDigits: 1 })}${displayUnit !== 'CURRENCY' ? stats.unitLabel : ''}`} subtext="Expected value" color={stats.totalNetPnL >= 0 ? 'emerald' : 'rose'} />
              <KPIBox 
                label="Streak" 
                value={`${stats.streakCount}`} 
                pill={stats.streakType === 'WIN' ? 'WIN' : stats.streakType === 'LOSS' ? 'DD' : 'STABLE'}
                subtext={stats.streakType === 'WIN' ? 'Succession' : stats.streakType === 'LOSS' ? 'Drawdown' : 'Stable'} 
                color={stats.streakType === 'WIN' ? 'emerald' : stats.streakType === 'LOSS' ? 'rose' : 'black'} 
              />
            </div>

            {/* Row 2: Secondary / Advanced Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <KPIBox 
                label="Profit Factor" 
                value={stats.profitFactor.toFixed(2)} 
                subtext="Gross Profit / Gross Loss" 
                pill={stats.profitFactor > 1.5 ? 'GOOD' : stats.profitFactor < 1.0 ? 'RISK' : 'NEUTRAL'}
                color={stats.profitFactor > 1.5 ? 'emerald' : stats.profitFactor >= 1.0 ? 'amber' : 'rose'} 
                tooltip={`You make $${stats.profitFactor.toFixed(2)} for every $1 you lose`}
              />
              <KPIBox 
                label="Expectancy" 
                value={`${stats.expectancy >= 0 ? '+' : ''}${displayUnit === 'CURRENCY' ? '$' : ''}${stats.expectancy.toLocaleString(undefined, { maximumFractionDigits: 2 })}${displayUnit !== 'CURRENCY' ? stats.unitLabel : ''}`} 
                subtext="Expected per trade" 
                color={stats.expectancy >= 0 ? 'emerald' : 'rose'} 
                tooltip="The average profit or loss you can expect to make per trade over time."
              />
              <KPIBox 
                label="Total Trades" 
                value={stats.total.toString()} 
                subtext={`${stats.wins} wins | ${stats.losses} losses`} 
                color="black" 
                tooltip={`Cumulative execution volume across the current scope.`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 apple-glass p-6 sm:p-8 rounded-[2rem] ambient-shadow relative overflow-hidden">
              <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-6 sm:mb-8">Equity Progress ({displayUnit})</h3>
              <div className="h-[200px] sm:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.equityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#000" opacity={0.05} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      cursor={false} 
                      contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '12px' }}
                      formatter={(value: any) => `${displayUnit === 'CURRENCY' ? '$' : ''}${value.toLocaleString()}${displayUnit !== 'CURRENCY' ? stats.unitLabel : ''}`}
                    />
                    <Area isAnimationActive={false} type="monotone" dataKey="value" stroke="black" strokeWidth={2.5} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="apple-glass p-6 sm:p-8 rounded-[2rem] ambient-shadow">
              <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-6 sm:mb-8">Weekday Bias ({displayUnit})</h3>
              <div className="h-[200px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.pnlByDay}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800 }} />
                    <Tooltip cursor={false} contentStyle={{ fontSize: '12px' }} formatter={(v:any) => `${displayUnit === 'CURRENCY' ? '$' : ''}${v.toLocaleString()}${displayUnit !== 'CURRENCY' ? stats.unitLabel : ''}`} />
                    <Bar dataKey="pnl" isAnimationActive={false}>
                      {stats.pnlByDay.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Alerts & Insights Panel */}
          {visibleAlerts.length > 0 && (
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="px-2">
                <h3 className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em] flex items-center gap-2">
                  <div className="w-1 h-3 bg-black/20 rounded-full" /> Operational Insights
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleAlerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`apple-glass p-6 rounded-2xl border-l-4 relative group transition-all duration-300 hover:scale-[1.01] ${
                      alert.type === 'danger' ? 'border-l-rose-500 bg-rose-500/[0.02]' : 
                      alert.type === 'warning' ? 'border-l-amber-500 bg-amber-500/[0.02]' : 
                      alert.type === 'success' ? 'border-l-emerald-500 bg-emerald-500/[0.02]' : 
                      'border-l-violet-500 bg-violet-500/[0.02]'
                    }`}
                  >
                    <button 
                      onClick={() => setDismissedAlerts(prev => new Set(prev).add(alert.id))}
                      className="absolute top-4 right-4 text-black/10 hover:text-black transition-colors"
                    >
                      <ICONS.Close className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        alert.type === 'danger' ? 'bg-rose-500/10 text-rose-600' : 
                        alert.type === 'warning' ? 'bg-amber-500/10 text-amber-600' : 
                        alert.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 
                        'bg-violet-500/10 text-violet-600'
                      }`}>
                        {alert.icon}
                      </div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest">{alert.title}</h4>
                    </div>
                    <p className="text-[11px] font-semibold text-black/60 leading-relaxed italic pr-4">
                      "{alert.message}"
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="pt-4">
         <TradeCalendar trades={trades} renderTradeDetail={renderTradeDetail} onTradeEdit={onTradeEdit} onTradeDelete={onTradeDelete} />
      </section>
    </div>
  );
};

export default Dashboard;