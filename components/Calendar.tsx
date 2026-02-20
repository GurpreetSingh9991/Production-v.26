import React, { useState, useMemo } from 'react';
import { Trade, PerformanceUnit } from '../types';
import { ICONS } from '../constants';

interface CalendarProps {
  trades: Trade[];
  displayUnit: PerformanceUnit;
  startingEquity: number;
  onTradeEdit: (trade: Trade) => void;
  onTradeDelete: (id: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({ trades, displayUnit, startingEquity, onTradeEdit, onTradeDelete }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // --- LOGIC ---
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

    // Fix: Cast Object.entries result to resolve arithmetic operation type errors
    const sortedDays = (Object.entries(dailyPnLs) as [string, number][]).sort((a, b) => b[1] - a[1]);
    const bestDay = sortedDays[0] || null;
    const worstDay = sortedDays[sortedDays.length - 1] || null;

    // Fix: Cast Object.values result to number[] to resolve comparison operator error with unknown types
    const winningDays = (Object.values(dailyPnLs) as number[]).filter(p => p > 0).length;
    const activeDays = Object.keys(dailyPnLs).length;

    return { totalPnL, winRate, bestDay, worstDay, winningDays, activeDays };
  }, [monthTrades]);

  const formatValue = (val: number) => {
    if (displayUnit === 'PERCENT') return `${((val / startingEquity) * 100).toFixed(2)}%`;
    return `$${Math.round(val).toLocaleString()}`;
  };

  // --- CALENDAR HELPERS ---
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

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
    for (let i = 1; i <= totalDays; i++) calendarDays.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    const res: (string | null)[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) res.push(calendarDays.slice(i, i + 7));
    if (res.length > 0) while (res[res.length - 1].length < 7) res[res.length - 1].push(null);
    return res;
  }, [year, month, totalDays, startDay]);

  return (
    <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-700">
      
      {/* Month Navigation & Stats Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-6">
            <button onClick={handlePrevMonth} className="w-10 h-10 flex items-center justify-center bg-white/40 hover:bg-white rounded-full transition-all border border-black/5 shadow-sm">
              <ICONS.ToggleLeft className="w-5 h-5 text-black/40" />
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">{monthName} {year}</h2>
              <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em] mt-1">Operational Summary</p>
            </div>
            <button onClick={handleNextMonth} className="w-10 h-10 flex items-center justify-center bg-white/40 hover:bg-white rounded-full transition-all border border-black/5 shadow-sm">
              <ICONS.ToggleRight className="w-5 h-5 text-black/40" />
            </button>
          </div>
          <button onClick={() => setCurrentDate(new Date())} className="px-5 py-2.5 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Today</button>
        </div>

        <div className="lg:col-span-4 ceramic-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-black/30 uppercase tracking-widest">Month Metrics</h4>
            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black ${monthStats.totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {monthStats.totalPnL >= 0 ? '+' : ''}{monthStats.winRate.toFixed(0)}% WR
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[8px] font-black text-black/20 uppercase tracking-widest">Net Yield</p>
              <p className={`text-xl font-black ${monthStats.totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatValue(monthStats.totalPnL)}
              </p>
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
      <div className="apple-glass p-4 md:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] ios-shadow border-white/60 overflow-hidden">
        <div className="grid grid-cols-7 gap-2 md:gap-4 mb-6">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="text-center text-[9px] font-black text-black/10 tracking-[0.3em]">{day}</div>
          ))}
        </div>
        <div className="space-y-2 md:space-y-4">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-cols-7 gap-2 md:gap-4">
              {week.map((dateStr, dIdx) => {
                if (!dateStr) return <div key={dIdx} className="aspect-square opacity-0"></div>;
                
                const dayTrades = tradesByDate[dateStr] || [];
                const netPnL = dayTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
                const isSelected = selectedDate === dateStr;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;

                return (
                  <button 
                    key={dateStr} 
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`relative aspect-square flex flex-col items-center justify-between rounded-2xl md:rounded-[2.2rem] transition-all duration-300 p-2 md:p-4 border ${
                      isSelected 
                        ? 'bg-black text-white shadow-2xl scale-105 z-10 border-black' 
                        : isToday 
                          ? 'bg-white border-black/40 shadow-md' 
                          : 'bg-white/40 hover:bg-white border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                       <span className={`text-[10px] md:text-[14px] font-black ${isSelected ? 'text-white' : 'text-black/50'}`}>
                         {parseInt(dateStr.split('-')[2])}
                       </span>
                       {dayTrades.length > 0 && !isSelected && (
                         <div className="w-1.5 h-1.5 rounded-full bg-black/10" />
                       )}
                    </div>
                    
                    {dayTrades.length > 0 && (
                      <div className="w-full truncate text-center">
                        <div className={`font-mono text-[8px] md:text-[11px] font-black ${isSelected ? 'text-white' : netPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {netPnL >= 0 ? '+' : '-'}${Math.abs(Math.floor(netPnL)).toLocaleString()}
                        </div>
                        <div className={`text-[6px] md:text-[7px] font-black uppercase tracking-widest mt-0.5 ${isSelected ? 'text-white/40' : 'text-black/20'}`}>
                          {dayTrades.length} Trades
                        </div>
                      </div>
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
        <div className="apple-glass p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] animate-reagle ios-shadow border-none space-y-8">
          <div className="flex items-center justify-between border-b border-black/5 pb-6">
             <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest mt-1">Execution Drill-down</p>
             </div>
             <button onClick={() => setSelectedDate(null)} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors text-black opacity-40">
               <ICONS.Close className="w-6 h-6" />
             </button>
          </div>
          
          <div className="space-y-4">
            {tradesByDate[selectedDate]?.map(trade => (
              <div key={trade.id} className="bg-white/40 border border-white/60 rounded-[2rem] p-5 hover:shadow-lg transition-all flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] ${trade.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                      {trade.side[0]}
                   </div>
                   <div>
                      <h4 className="text-sm font-black tracking-tight">{trade.symbol}</h4>
                      <p className="text-[9px] font-bold text-black/20 uppercase tracking-widest">{trade.setupType} Variant</p>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-right">
                      <p className={`text-sm font-black font-mono ${trade.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                         {trade.pnl >= 0 ? '+' : '-'}${Math.abs(trade.pnl).toLocaleString()}
                      </p>
                      <p className="text-[9px] font-bold text-black/20 uppercase tracking-widest">{trade.rr}R Yield</p>
                   </div>
                   <button onClick={() => onTradeEdit(trade)} className="text-black/20 hover:text-black transition-colors"><ICONS.Edit className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {(!tradesByDate[selectedDate] || tradesByDate[selectedDate].length === 0) && (
              <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                 <ICONS.Journal className="w-12 h-12" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Recorded Activity</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;