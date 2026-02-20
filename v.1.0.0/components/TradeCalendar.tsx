
import React, { useState, useMemo } from 'react';
import { Trade } from '../types';
import { ICONS } from '../constants';

interface TradeCalendarProps {
  trades: Trade[];
  onTradeEdit: (trade: Trade) => void;
  onTradeDelete: (id: string) => void;
  renderTradeDetail: (trade: Trade) => React.ReactNode;
}

const TradeCalendar: React.FC<TradeCalendarProps> = ({ trades, renderTradeDetail }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const tradesByDate = useMemo(() => {
    return trades.reduce((acc, trade) => {
      acc[trade.date] = acc[trade.date] || [];
      acc[trade.date].push(trade);
      return acc;
    }, {} as Record<string, Trade[]>);
  }, [trades]);

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
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-6">
          <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors"><ICONS.ToggleLeft className="w-4 h-4 opacity-30" /></button>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">{monthName} {year}</h3>
          <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors"><ICONS.ToggleRight className="w-4 h-4 opacity-30" /></button>
        </div>
        <button onClick={() => setCurrentDate(new Date())} className="text-[10px] font-black text-black/30 hover:text-black uppercase tracking-widest transition-colors">Today</button>
      </div>

      <div className="apple-glass p-4 md:p-12 rounded-[2.5rem] border border-white/60 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 gap-2 md:gap-4 mb-8">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => <div key={day} className="text-center text-[9px] font-black text-black/10 tracking-[0.3em]">{day}</div>)}
        </div>
        <div className="space-y-2 md:space-y-4">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-cols-7 gap-2 md:gap-4">
              {week.map((dateStr, dIdx) => {
                if (!dateStr) return <div key={dIdx} className="aspect-square opacity-0"></div>;
                const dayTrades = tradesByDate[dateStr] || [];
                const netPnL = dayTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
                const isSelected = selectedDate === dateStr;
                return (
                  <button 
                    key={dateStr} 
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl md:rounded-[1.8rem] transition-all duration-300 p-1 ${
                      isSelected ? 'bg-black text-white shadow-2xl scale-105 z-10' : 'bg-white/40 hover:bg-white border border-white/10'
                    }`}
                  >
                    <span className={`text-[10px] md:text-[13px] font-bold ${isSelected ? 'text-white' : 'text-black/50'}`}>{parseInt(dateStr.split('-')[2])}</span>
                    {dayTrades.length > 0 && (
                      <div className={`mt-0.5 md:mt-1 font-mono text-[8px] md:text-[10px] font-black truncate max-w-full ${netPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {netPnL >= 0 ? '+' : '-'}${Math.abs(Math.floor(netPnL))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="mt-12 p-8 md:p-12 apple-glass rounded-[2.5rem] animate-reagle ambient-shadow border-none">
          <div className="flex items-center justify-between mb-8 border-b border-black/5 pb-6">
             <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">{new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest mt-1">Daily Log Breakdown</p>
             </div>
             <button onClick={() => setSelectedDate(null)} className="text-black/30 hover:text-black transition-colors"><ICONS.Close className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            {tradesByDate[selectedDate]?.map(t => (
              <div key={t.id}>{renderTradeDetail(t)}</div>
            ))}
            {(!tradesByDate[selectedDate] || tradesByDate[selectedDate].length === 0) && (
              <div className="text-center py-20 flex flex-col items-center gap-4 opacity-20">
                 <ICONS.Journal className="w-10 h-10" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Recorded Activity</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeCalendar;
