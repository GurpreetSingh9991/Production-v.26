import React, { useState, useMemo } from 'react';
import { Trade, PerformanceUnit } from '../types';
import { ICONS } from '../constants';

interface CalendarProps {
  trades: Trade[];
  displayUnit: PerformanceUnit;
  startingEquity: number;
  onTradeEdit: (trade: Trade) => void;
  onTradeDelete: (id: string) => void;
  onAddTradeForDate: (date: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({ trades, displayUnit, startingEquity, onTradeEdit, onTradeDelete, onAddTradeForDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const tradesByDate = useMemo(() => {
    return trades.reduce((acc, trade) => {
      acc[trade.date] = acc[trade.date] || [];
      acc[trade.date].push(trade);
      return acc;
    }, {} as Record<string, Trade[]>);
  }, [trades]);

  const monthTrades = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return trades.filter(t => {
      const d = new Date(t.date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [trades, currentDate]);

  const monthStats = useMemo(() => {
    const totalPnL = monthTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const winRate = monthTrades.length > 0
      ? (monthTrades.filter(t => t.pnl > 0).length / monthTrades.length) * 100
      : 0;
    const dailyPnLs = monthTrades.reduce((acc, t) => {
      acc[t.date] = (acc[t.date] || 0) + (Number(t.pnl) || 0);
      return acc;
    }, {} as Record<string, number>);
    const winningDays = (Object.values(dailyPnLs) as number[]).filter(p => p > 0).length;
    const activeDays = Object.keys(dailyPnLs).length;
    return { totalPnL, winRate, winningDays, activeDays };
  }, [monthTrades]);

  const formatValue = (val: number) => {
    if (displayUnit === 'PERCENT' && startingEquity > 0)
      return `${((val / startingEquity) * 100).toFixed(2)}%`;
    return `$${Math.round(val).toLocaleString()}`;
  };

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const weeks = useMemo(() => {
    const calendarDays: (string | null)[] = [];
    for (let i = 0; i < startDay; i++) calendarDays.push(null);
    for (let i = 1; i <= totalDays; i++)
      calendarDays.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    const res: (string | null)[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) res.push(calendarDays.slice(i, i + 7));
    if (res.length > 0) while (res[res.length - 1].length < 7) res[res.length - 1].push(null);
    return res;
  }, [year, month, totalDays, startDay]);

  const handleDeleteTrade = (id: string) => {
    if (confirmDeleteId === id) {
      onTradeDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const isPastOrToday = (dateStr: string) => dateStr <= todayStr;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">

      {/* Month Navigation */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full apple-glass p-6 rounded-[2.5rem] border border-black/5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={handlePrevMonth} className="w-10 h-10 flex items-center justify-center bg-black/5 hover:bg-black/10 rounded-full transition-all active:scale-90">
              <ICONS.ToggleLeft className="w-5 h-5 text-black/60" />
            </button>
            <div className="text-center min-w-[160px]">
              <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">{monthName} {year}</h2>
              <p className="text-[9px] font-black text-black/20 uppercase tracking-[0.2em] mt-1">Operational Summary</p>
            </div>
            <button onClick={handleNextMonth} className="w-10 h-10 flex items-center justify-center bg-black/5 hover:bg-black/10 rounded-full transition-all active:scale-90">
              <ICONS.ToggleRight className="w-5 h-5 text-black/60" />
            </button>
          </div>
          <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(todayStr); }} className="px-6 py-3 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
            Go to Today
          </button>
        </div>

        <div className="w-full lg:w-[320px] apple-glass p-6 rounded-[2.5rem] border border-black/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-black/30 uppercase tracking-widest">Month Metrics</h4>
            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black ${monthStats.totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {monthStats.totalPnL >= 0 ? '+' : ''}{monthStats.winRate.toFixed(0)}% WR
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[8px] font-black text-black/20 uppercase tracking-widest">Net Yield</p>
              <p className={`text-xl font-black ${monthStats.totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatValue(monthStats.totalPnL)}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-black/20 uppercase tracking-widest">Volume</p>
              <p className="text-xl font-black">{monthTrades.length} Trades</p>
            </div>
          </div>
          <div className="h-px bg-black/5" />
          <div className="flex justify-between">
            <div>
              <p className="text-[7px] font-black text-black/20 uppercase tracking-widest">Winning Days</p>
              <p className="text-[10px] font-black">{monthStats.winningDays} / {monthStats.activeDays}</p>
            </div>
            <div className="text-right">
              <p className="text-[7px] font-black text-black/20 uppercase tracking-widest">Consistency</p>
              <p className="text-[10px] font-black">{monthStats.activeDays > 0 ? ((monthStats.winningDays / monthStats.activeDays) * 100).toFixed(0) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="apple-glass p-4 md:p-8 rounded-[2.5rem] sm:rounded-[3.5rem] ios-shadow border-white/60 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 md:gap-3 mb-4 md:mb-6">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[9px] md:text-[11px] lg:text-xs font-black text-black/25 tracking-[0.12em] uppercase">{day}</div>
          ))}
        </div>

        {/* Weeks */}
        <div className="space-y-1.5 md:space-y-2.5">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-cols-7 gap-1.5 md:gap-2.5">
              {week.map((dateStr, dIdx) => {
                if (!dateStr) return <div key={dIdx} className="aspect-square opacity-0" />;

                const dayTrades = tradesByDate[dateStr] || [];
                const netPnL = dayTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === todayStr;
                const dayNum = parseInt(dateStr.split('-')[2]);
                const hasTrades = dayTrades.length > 0;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`relative flex flex-col rounded-xl md:rounded-2xl lg:rounded-[1.4rem] transition-all duration-200 border group overflow-hidden ${
                      isSelected
                        ? 'bg-black shadow-2xl scale-[1.03] z-10 border-black'
                        : isToday
                          ? 'bg-white border-black/25 shadow-md'
                          : hasTrades
                            ? 'bg-white/70 hover:bg-white border-white/60 hover:shadow-sm'
                            : 'bg-white/30 hover:bg-white/60 border-white/30'
                    }`}
                    style={{ aspectRatio: '1', padding: 'clamp(6px, 1.5vw, 14px)' }}
                  >
                    {/* Date number */}
                    <div className="flex items-start justify-between w-full">
                      <span className={`font-black tabular-nums leading-none ${
                        isSelected ? 'text-white' : isToday ? 'text-black' : 'text-black/55'
                      }`} style={{ fontSize: 'clamp(10px, 2vw, 17px)' }}>
                        {dayNum}
                      </span>
                      {/* Trade count dot / indicator */}
                      {hasTrades && !isSelected && (
                        <div className={`rounded-full shrink-0 ${netPnL >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                          style={{ width: 'clamp(4px, 0.8vw, 7px)', height: 'clamp(4px, 0.8vw, 7px)', marginTop: '2px' }} />
                      )}
                    </div>

                    {/* P&L — shown only when there are trades */}
                    {hasTrades && (
                      <div className="w-full mt-auto">
                        <div className={`font-black tabular-nums leading-none ${
                          isSelected ? 'text-white' : netPnL >= 0 ? 'text-emerald-600' : 'text-rose-500'
                        }`} style={{ fontSize: 'clamp(7px, 1.4vw, 12px)' }}>
                          {netPnL >= 0 ? '+' : '−'}${Math.abs(Math.floor(netPnL)).toLocaleString()}
                        </div>
                        <div className={`font-bold leading-none mt-px hidden md:block ${
                          isSelected ? 'text-white/35' : 'text-black/20'
                        }`} style={{ fontSize: 'clamp(5px, 0.8vw, 8px)' }}>
                          {dayTrades.length} {dayTrades.length === 1 ? 'trade' : 'trades'}
                        </div>
                      </div>
                    )}

                    {/* Today ring */}
                    {isToday && !isSelected && (
                      <div className="absolute inset-0 rounded-xl md:rounded-2xl lg:rounded-[1.4rem] ring-1.5 ring-black/20 pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Day Drill-down */}
      {selectedDate && (
        <div className="apple-glass p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] ios-shadow border-none space-y-6 animate-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-start justify-between border-b border-black/5 pb-5">
            <div>
              <h3 className="text-base font-black uppercase tracking-[0.12em] text-black leading-tight">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <p className="text-[9px] font-bold text-black/25 uppercase tracking-widest mt-1.5">
                {(tradesByDate[selectedDate]?.length || 0)} {(tradesByDate[selectedDate]?.length || 0) === 1 ? 'trade' : 'trades'} recorded
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isPastOrToday(selectedDate) && (
                <button
                  onClick={() => { onAddTradeForDate(selectedDate); setSelectedDate(null); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  <ICONS.Plus className="w-3 h-3" />
                  Log Trade
                </button>
              )}
              <button onClick={() => setSelectedDate(null)} className="w-9 h-9 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors text-black/25 hover:text-black active:scale-90">
                <ICONS.Close className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {tradesByDate[selectedDate]?.map(trade => (
              <div key={trade.id} className="bg-white/60 border border-white/80 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 ${trade.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                      {trade.side === 'LONG' ? 'L' : 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black tracking-tight text-black">{trade.symbol}</h4>
                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0 ${
                          trade.result === 'WIN' ? 'bg-emerald-500/10 text-emerald-600'
                          : trade.result === 'LOSS' ? 'bg-rose-500/10 text-rose-600'
                          : 'bg-black/5 text-black/40'
                        }`}>{trade.result}</span>
                      </div>
                      <p className="text-[9px] font-bold text-black/25 uppercase tracking-widest mt-0.5 truncate">
                        {trade.setupType} · {trade.entryTime}–{trade.exitTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={`text-sm font-black font-mono ${trade.pnl >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {trade.pnl >= 0 ? '+' : '−'}${Math.abs(trade.pnl).toLocaleString()}
                      </p>
                      <p className="text-[8px] font-bold text-black/20 uppercase tracking-widest">{trade.rr}R</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onTradeEdit(trade)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/5 hover:bg-black hover:text-white text-black/30 transition-all active:scale-90">
                        <ICONS.Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTrade(trade.id)}
                        className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
                          confirmDeleteId === trade.id
                            ? 'bg-rose-500 text-white'
                            : 'bg-black/5 hover:bg-rose-500/10 text-black/30 hover:text-rose-500'
                        }`}
                        title={confirmDeleteId === trade.id ? 'Tap again to confirm' : 'Delete'}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(!tradesByDate[selectedDate] || tradesByDate[selectedDate].length === 0) && (
              <div className="text-center py-14 flex flex-col items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-black/[0.04] flex items-center justify-center">
                  <ICONS.Journal className="w-7 h-7 text-black/12" />
                </div>
                <div>
                  <p className="text-sm font-black text-black/25 uppercase tracking-widest">No Trades Recorded</p>
                  <p className="text-[10px] font-bold text-black/15 mt-1">
                    {isPastOrToday(selectedDate) ? 'Forgot to log one?' : 'This date is in the future'}
                  </p>
                </div>
                {isPastOrToday(selectedDate) && (
                  <button
                    onClick={() => { onAddTradeForDate(selectedDate); setSelectedDate(null); }}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                  >
                    <ICONS.Plus className="w-3.5 h-3.5" />
                    Log a Trade for This Day
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
