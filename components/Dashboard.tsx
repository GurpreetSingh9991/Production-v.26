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
  priority: number;
}

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-white/40 rounded-2xl" />
      ))}
    </div>
    <div className="h-64 bg-white/40 rounded-2xl" />
  </div>
);

// Empty State
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 px-6 animate-in fade-in zoom-in-95 duration-700">
    <div className="w-24 h-24 bg-gradient-to-br from-black/5 to-black/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
      <ICONS.LineChart className="w-12 h-12 text-black/20" />
    </div>
    <h3 className="text-2xl font-black text-black/80 mb-2 tracking-tight">No Trades Yet</h3>
    <p className="text-sm text-black/40 mb-8 max-w-md text-center leading-relaxed">
      Start logging your first trade to unlock real-time analytics, AI insights, and performance tracking
    </p>
    <div className="px-6 py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg">
      Log First Trade →
    </div>
  </div>
);

// Enhanced KPI Box with tiers and trends
const KPIBox = React.memo(({ label, value, subtext, pill, color, tooltip, tier = 2, trend }: any) => {
  const getTierStyle = () => {
    switch (tier) {
      case 1: return 'p-6 sm:p-8';
      case 2: return 'p-5 sm:p-6';
      case 3: return 'p-4 sm:p-5';
      default: return 'p-5 sm:p-6';
    }
  };

  const getValueSize = () => {
    switch (tier) {
      case 1: return 'text-3xl sm:text-4xl';
      case 2: return 'text-xl sm:text-2xl';
      case 3: return 'text-lg sm:text-xl';
      default: return 'text-xl sm:text-2xl';
    }
  };

  return (
    <div 
      className={`apple-glass ${getTierStyle()} rounded-2xl shadow-lg hover:shadow-xl flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 overflow-hidden cursor-default animate-in fade-in slide-in-from-bottom-2 border border-white/60`}
      title={tooltip}
      style={{ 
        boxShadow: tier === 1 ? '0 8px 32px rgba(0,0,0,0.12)' : '0 4px 16px rgba(0,0,0,0.08)'
      }}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h4 className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-black/50 truncate pr-1">{label}</h4>
        {pill && (
          <span className={`px-2 py-1 rounded-full text-[7px] sm:text-[8px] font-black tracking-widest flex-shrink-0 ${
            pill === 'WIN' || pill === 'GOOD' ? 'bg-emerald-500/10 text-emerald-600' : 
            pill === 'DD' || pill === 'RISK' ? 'bg-rose-500/10 text-rose-600' : 'bg-black/5 text-black/40'
          }`}>
            {pill}
          </span>
        )}
      </div>
      <div className="overflow-hidden">
        <div className="flex items-baseline gap-2">
          <p className={`${getValueSize()} font-black tracking-tight truncate ${
            color === 'rose' ? 'text-rose-600' : 
            color === 'emerald' ? 'text-emerald-600' : 
            color === 'amber' ? 'text-amber-500' : 
            'text-black'
          }`}>
            {value}
          </p>
          {trend && (
            <span className={`text-sm font-bold ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-black/30'}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            </span>
          )}
        </div>
        <p className="text-[8px] sm:text-[10px] font-bold text-black/30 uppercase tracking-widest mt-1 truncate">{subtext}</p>
      </div>
    </div>
  );
});

const Dashboard: React.FC<DashboardProps> = ({ trades, activeAccount, accounts, onTradeEdit, onTradeDelete, displayUnit }) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange>('ALL');
  const [isLoading] = useState(false);

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

  const smartAsset = useMemo(() => {
    if (!filteredByDateTrades.length) return { type: 'STOCKS', label: 'Stocks', qtyLabel: 'Shares', topSymbols: [], pnlLabel: '$', isMixed: false };
    const counts: Record<string, number> = {};
    const symbolCounts: Record<string, { count: number; pnl: number }> = {};
    filteredByDateTrades.forEach(t => {
      const a = t.assetType || 'STOCKS';
      counts[a] = (counts[a] || 0) + 1;
      const sym = (t.symbol || '').toUpperCase();
      if (sym) {
        if (!symbolCounts[sym]) symbolCounts[sym] = { count: 0, pnl: 0 };
        symbolCounts[sym].count += 1;
        symbolCounts[sym].pnl += t.pnl || 0;
      }
    });
    const topSymbols = Object.entries(symbolCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([sym, data]) => ({ symbol: sym, count: data.count, pnl: data.pnl }));

    const isMixed = Object.keys(counts).length > 1;
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const type = dominant ? dominant[0] : 'STOCKS';
    let label = 'Stocks', qtyLabel = 'Shares', pnlLabel = '$';
    
    if (type === 'FOREX') { label = 'Forex'; qtyLabel = 'Lots'; pnlLabel = '$'; }
    else if (type === 'FUTURES') { label = 'Futures'; qtyLabel = 'Contracts'; pnlLabel = '$'; }
    
    return { type, label, qtyLabel, topSymbols, pnlLabel, isMixed };
  }, [filteredByDateTrades]);

  const getUnitLabel = () => {
    if (displayUnit === 'PERCENT') return '%';
    if (displayUnit === 'R_MULTIPLE') return 'R';
    if (displayUnit === 'TICKS') return ' Tks';
    return '$';
  };

  const formatValue = (pnl: number, trade?: Trade): number => {
    if (displayUnit === 'PERCENT') {
      return startingEquity > 0 ? (pnl / startingEquity) * 100 : 0;
    } else if (displayUnit === 'R_MULTIPLE') {
      // ✅ FIX: If we have a specific trade, use its RR
      if (trade) return trade.rr || 0;
      // For aggregate calculations, pnl already contains the R sum
      return pnl;
    } else if (displayUnit === 'TICKS') {
      if (!trade) return 0;
      return (Math.abs(trade.exitPrice - trade.entryPrice)) * (trade.multiplier || 1);
    }
    return pnl;
  };

  const stats = useMemo(() => {
    const currentTrades = filteredByDateTrades;
    if (!currentTrades.length) return null;

    const sortedTrades = [...currentTrades].sort((a, b) => new Date(a.date + 'T12:00:00').getTime() - new Date(b.date + 'T12:00:00').getTime());
    const winTrades = currentTrades.filter(t => t.result === 'WIN');
    const lossTrades = currentTrades.filter(t => t.result === 'LOSS');
    
    // ✅ FIX: Calculate totals based on display unit
    const totalNetPnL = displayUnit === 'R_MULTIPLE'
      ? currentTrades.reduce((sum, t) => sum + (t.rr || 0), 0)  // Sum of R values
      : currentTrades.reduce((sum, t) => sum + t.pnl, 0);        // Sum of $ values
    
    const avgPnL = totalNetPnL / currentTrades.length;
    const winRate = currentTrades.length ? (winTrades.length / currentTrades.length) * 100 : 0;
    
    const totalWinPnL = winTrades.reduce((sum, t) => sum + formatValue(t.pnl, t), 0);
    const totalLossPnL = Math.abs(lossTrades.reduce((sum, t) => sum + formatValue(t.pnl, t), 0));
    const profitFactor = totalLossPnL > 0 ? totalWinPnL / totalLossPnL : totalWinPnL > 0 ? 999 : 0;
    
    const avgWin = winTrades.length ? totalWinPnL / winTrades.length : 0;
    const avgLoss = lossTrades.length ? totalLossPnL / lossTrades.length : 0;
    const expectancy = winRate > 0 ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss : 0;

    let peak = displayUnit === 'CURRENCY' ? startingEquity : 0;
    let maxDrawdown = 0;
    let cumulative = displayUnit === 'CURRENCY' ? startingEquity : 0;

    sortedTrades.forEach(t => {
      cumulative += formatValue(t.pnl, t);
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    const maxDrawdownPct = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

    let streakCount = 0, streakType: 'WIN' | 'LOSS' | null = null;
    for (let i = sortedTrades.length - 1; i >= 0; i--) {
      const t = sortedTrades[i];
      if (t.result === 'BE') continue;
      if (!streakType) { streakType = t.result; streakCount = 1; continue; }
      if (t.result === streakType) { streakCount++; } else { break; }
    }

    const setups: Record<string, { total: number; wins: number }> = {};
    currentTrades.forEach(t => {
      const s = (t.setupType || 'A').toUpperCase();
      if (!setups[s]) setups[s] = { total: 0, wins: 0 };
      setups[s].total++;
      if (t.result === 'WIN') setups[s].wins++;
    });

    const bestSetupEntry = Object.entries(setups)
      .map(([name, s]) => ({ name, winRate: (s.wins / s.total) * 100 }))
      .sort((a, b) => b.winRate - a.winRate)[0];

    const followedPlanCount = currentTrades.filter(t => t.followedPlan === true).length;
    const disciplineScore = currentTrades.length > 0 ? (followedPlanCount / currentTrades.length) * 100 : 0;

    let cumulative2 = displayUnit === 'CURRENCY' ? (startingEquity || 0) : 0;
    const equityData = sortedTrades.map((t) => {
      const val = formatValue(t.pnl, t);
      cumulative2 += val;
      return { value: cumulative2, date: t.date, pnl: val };
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pnlByDay = days.map((day, idx) => {
      const dayPnL = currentTrades
        .filter(t => new Date(t.date + 'T12:00:00').getDay() === idx)
        .reduce((sum, t) => sum + formatValue(t.pnl, t), 0);
      return { name: day, pnl: dayPnL };
    });

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
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      equityData, 
      pnlByDay,
      currentBalance: cumulative2,
      streakCount, 
      streakType,
      maxDrawdownPct,
      disciplineScore,
      unitLabel: getUnitLabel(),
      activeAlerts: activeAlerts.sort((a, b) => b.priority - a.priority).slice(0, 3)
    };
  }, [filteredByDateTrades, activeAccount, accounts, displayUnit, startingEquity]);

  // ✅ FIX: Memoize renderTradeDetail to prevent recreation on every render
  const renderTradeDetail = React.useCallback((trade: Trade) => {
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
      <div key={trade.id} className="bg-white/50 border border-white/80 rounded-2xl p-4 sm:p-5 mb-3 hover:shadow-lg hover:scale-[1.01] transition-all duration-200 animate-in fade-in slide-in-from-bottom-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-[10px] shadow-inner ${trade.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {trade.side[0]}
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold tracking-tight text-black">{trade.symbol}</h4>
              <p className="text-[9px] sm:text-[10px] font-bold text-black/30 uppercase tracking-widest">{trade.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <span className={`text-sm sm:text-base font-black font-mono ${trade.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {prefix}{displayPnL.toLocaleString(undefined, { maximumFractionDigits: 2 })}{suffix}
            </span>
            <button onClick={() => onTradeEdit(trade)} className="text-black/20 hover:text-black transition-colors hover:scale-110 active:scale-95">
              <ICONS.Edit className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }, [displayUnit, startingEquity, onTradeEdit]);

  const visibleAlerts = useMemo(() => {
    return stats?.activeAlerts.filter(a => !dismissedAlerts.has(a.id)) || [];
  }, [stats?.activeAlerts, dismissedAlerts]);

  if (!trades.length && !isLoading) {
    return <EmptyState />;
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const getPnLTrend = () => {
    if (!stats) return null;
    return stats.totalNetPnL > 0 ? 'up' : stats.totalNetPnL < 0 ? 'down' : 'neutral';
  };

  const getWinRateTrend = () => {
    if (!stats) return null;
    return stats.winRate > 50 ? 'up' : stats.winRate < 50 ? 'down' : 'neutral';
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex flex-col">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter leading-none text-black">
            {activeAccount?.name || 'Overall Performance'}
          </h2>
          <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em] mt-1">
            {smartAsset.isMixed ? 'Multi-Asset' : smartAsset.label} · {dateRange === 'ALL' ? 'All Time' : dateRange}
          </p>
        </div>

        <div className="flex gap-2 bg-white/40 p-1.5 rounded-xl border border-white/60 shadow-inner">
          {(['ALL', 'TODAY', '7D', '30D', 'MTD', 'YTD'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                dateRange === range
                  ? 'bg-black text-white shadow-lg'
                  : 'text-black/40 hover:text-black hover:bg-white/50'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {visibleAlerts.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-3 duration-700">
          {visibleAlerts.map(alert => (
            <div
              key={alert.id}
              className={`rounded-2xl p-4 sm:p-5 flex items-start gap-4 border-2 shadow-lg transition-all hover:scale-[1.01] ${
                alert.type === 'danger' ? 'bg-rose-50 border-rose-200' :
                alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                alert.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
                'bg-blue-50 border-blue-200'
              }`}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                alert.type === 'danger' ? 'bg-rose-500 text-white' :
                alert.type === 'warning' ? 'bg-amber-500 text-white' :
                alert.type === 'success' ? 'bg-emerald-500 text-white' :
                'bg-blue-500 text-white'
              }`}>
                {alert.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black tracking-tight text-black mb-1">{alert.title}</h4>
                <p className="text-xs text-black/60 leading-relaxed">{alert.message}</p>
              </div>
              <button
                onClick={() => setDismissedAlerts(prev => new Set([...prev, alert.id]))}
                className="flex-shrink-0 text-black/20 hover:text-black transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <KPIBox
              tier={1}
              label="Net P&L"
              value={`${stats.totalNetPnL >= 0 ? '+' : ''}${stats.totalNetPnL.toLocaleString(undefined, { maximumFractionDigits: 2 })}${stats.unitLabel}`}
              subtext={stats.totalNetPnL >= 0 ? 'Profitable Period' : 'Drawdown Period'}
              color={stats.totalNetPnL >= 0 ? 'emerald' : 'rose'}
              trend={getPnLTrend()}
              tooltip="Total realized profit/loss"
            />
            <KPIBox
              tier={1}
              label="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              subtext={`${stats.wins} Wins · ${stats.losses} Losses`}
              color={stats.winRate >= 50 ? 'emerald' : stats.winRate >= 40 ? 'amber' : 'rose'}
              trend={getWinRateTrend()}
              pill={stats.winRate >= 50 ? 'GOOD' : 'RISK'}
              tooltip="Percentage of winning trades"
            />
            <KPIBox
              tier={1}
              label="Profit Factor"
              value={stats.profitFactor.toFixed(2)}
              subtext={stats.profitFactor >= 2 ? 'Exceptional Edge' : stats.profitFactor >= 1.5 ? 'Solid Edge' : 'Needs Work'}
              color={stats.profitFactor >= 2 ? 'emerald' : stats.profitFactor >= 1.5 ? 'amber' : 'rose'}
              trend={stats.profitFactor >= 1.5 ? 'up' : 'down'}
              tooltip="Gross profit / Gross loss"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPIBox
              tier={2}
              label="Avg Win"
              value={`${stats.avgWin >= 0 ? '+' : ''}${stats.avgWin.toLocaleString(undefined, { maximumFractionDigits: 2 })}${stats.unitLabel}`}
              subtext="Per Winning Trade"
              color="emerald"
              tooltip="Average profit per winning trade"
            />
            <KPIBox
              tier={2}
              label="Avg Loss"
              value={`-${stats.avgLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}${stats.unitLabel}`}
              subtext="Per Losing Trade"
              color="rose"
              tooltip="Average loss per losing trade"
            />
            <KPIBox
              tier={2}
              label="Expectancy"
              value={`${stats.expectancy >= 0 ? '+' : ''}${stats.expectancy.toLocaleString(undefined, { maximumFractionDigits: 2 })}${stats.unitLabel}`}
              subtext={stats.expectancy > 0 ? 'Positive Edge' : 'Negative Edge'}
              color={stats.expectancy > 0 ? 'emerald' : 'rose'}
              tooltip="Expected value per trade"
            />
            <KPIBox
              tier={2}
              label="Total Trades"
              value={stats.total}
              subtext={`${smartAsset.label} Executed`}
              tooltip="Number of trades executed"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPIBox
              tier={3}
              label="Max Drawdown"
              value={`${stats.maxDrawdownPct.toFixed(1)}%`}
              subtext="Peak to Trough"
              color={stats.maxDrawdownPct > 15 ? 'rose' : stats.maxDrawdownPct > 10 ? 'amber' : 'emerald'}
              pill={stats.maxDrawdownPct > 15 ? 'DD' : undefined}
              tooltip="Maximum decline from peak"
            />
            <KPIBox
              tier={3}
              label="Discipline"
              value={`${stats.disciplineScore.toFixed(0)}%`}
              subtext="Plan Adherence"
              color={stats.disciplineScore >= 70 ? 'emerald' : 'amber'}
              tooltip="Percentage following trading plan"
            />
            <KPIBox
              tier={3}
              label="Current Streak"
              value={`${stats.streakCount}`}
              subtext={stats.streakType === 'WIN' ? 'Win Streak' : stats.streakType === 'LOSS' ? 'Loss Streak' : 'No Streak'}
              color={stats.streakType === 'WIN' ? 'emerald' : stats.streakType === 'LOSS' ? 'rose' : undefined}
              tooltip="Current consecutive wins/losses"
            />
            <KPIBox
              tier={3}
              label="Current Balance"
              value={`${stats.currentBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}${stats.unitLabel}`}
              subtext="Live Equity"
              tooltip="Account balance with trades applied"
            />
            <KPIBox
              tier={3}
              label="Avg P&L"
              value={`${stats.avgPnL >= 0 ? '+' : ''}${stats.avgPnL.toLocaleString(undefined, { maximumFractionDigits: 2 })}${stats.unitLabel}`}
              subtext="Per Trade"
              color={stats.avgPnL >= 0 ? 'emerald' : 'rose'}
              tooltip="Average profit/loss per trade"
            />
          </div>

          <div className="apple-glass rounded-2xl p-6 shadow-lg border border-white/60 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mb-6">Equity Curve</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats.equityData}>
                <defs>
                  <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={stats.totalNetPnL >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={stats.totalNetPnL >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#000" opacity={0.05} />
                <XAxis dataKey="date" stroke="#000" opacity={0.2} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis stroke="#000" opacity={0.2} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '8px 12px'
                  }}
                />
                <Area type="monotone" dataKey="value" stroke={stats.totalNetPnL >= 0 ? "#10b981" : "#ef4444"} strokeWidth={3} fill="url(#colorPnL)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="apple-glass rounded-2xl p-6 shadow-lg border border-white/60 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mb-6">Performance by Day</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.pnlByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#000" opacity={0.05} />
                <XAxis dataKey="name" stroke="#000" opacity={0.2} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis stroke="#000" opacity={0.2} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '8px 12px'
                  }}
                />
                <Bar dataKey="pnl" radius={[8, 8, 0, 0]}>
                  {stats.pnlByDay.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} opacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
            <TradeCalendar 
              trades={filteredByDateTrades} 
              onTradeEdit={onTradeEdit}
              onTradeDelete={onTradeDelete}
              renderTradeDetail={renderTradeDetail}
            />
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">Recent Trades</h3>
              <span className="text-[9px] font-black text-black/30 uppercase tracking-widest">{filteredByDateTrades.length} Total</span>
            </div>
            <div className="space-y-3">
              {/* ✅ FIX: Sort by date descending (latest first), then take first 10 */}
              {[...filteredByDateTrades]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map(renderTradeDetail)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
