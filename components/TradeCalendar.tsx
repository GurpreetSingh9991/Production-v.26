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

  const todayStr = new Date().toISOString().split('T')[0];

  // Normalize date to YYYY-MM-DD — guards against Supabase returning full datetime strings
  const normalizeDate = (d: string) => (d ? String(d).split('T')[0].trim() : d);

  const tradesByDate = useMemo(() => {
    return trades.reduce((acc, trade) => {
      const key = normalizeDate(trade.date);
      acc[key] = acc[key] || [];
      acc[key].push(trade);
      return acc;
    }, {} as Record<string, Trade[]>);
  }, [trades]);

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

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors active:scale-90">
            <ICONS.ToggleLeft className="w-4 h-4 text-black/40" />
          </button>
          <h3 className="text-[12px] font-black uppercase tracking-[0.15em]">{monthName} {year}</h3>
          <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors active:scale-90">
            <ICONS.ToggleRight className="w-4 h-4 text-black/40" />
          </button>
        </div>
        <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(todayStr); }} className="text-[9px] font-black text-black/30 hover:text-black uppercase tracking-widest transition-colors">
          Today
        </button>
      </div>

      {/* Calendar grid */}
      <div className="apple-glass p-3 md:p-6 rounded-[2rem] border border-white/60 shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-3 md:mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[8px] md:text-[10px] font-black text-black/20 tracking-[0.1em] uppercase">{day}</div>
          ))}
        </div>

        <div className="space-y-1 md:space-y-2">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-cols-7 gap-1 md:gap-2">
              {week.map((dateStr, dIdx) => {
                if (!dateStr) return <div key={dIdx} className="aspect-square opacity-0" />;

                const dayTrades = tradesByDate[dateStr] || [];
                const netPnL = dayTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === todayStr;
                const hasTrades = dayTrades.length > 0;
                const dayNum = parseInt(dateStr.split('-')[2]);

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`relative flex flex-col rounded-lg md:rounded-2xl transition-all duration-200 border overflow-hidden ${
                      isSelected
                        ? 'bg-black shadow-xl scale-[1.04] z-10 border-black'
                        : isToday
                          ? 'bg-white border-black/25 shadow-md'
                          : hasTrades
                            ? 'bg-white/70 hover:bg-white border-white/60 hover:shadow-sm'
                            : 'bg-white/30 hover:bg-white/60 border-white/30'
                    }`}
                    style={{ aspectRatio: '1', padding: 'clamp(4px, 1.2vw, 10px)' }}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className={`font-black tabular-nums leading-none ${
                        isSelected ? 'text-white' : isToday ? 'text-black' : 'text-black/55'
                      }`} style={{ fontSize: 'clamp(9px, 1.8vw, 14px)' }}>
                        {dayNum}
                      </span>
                      {hasTrades && !isSelected && (
                        <div className={`rounded-full shrink-0 ${netPnL >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                          style={{ width: 'clamp(3px, 0.6vw, 5px)', height: 'clamp(3px, 0.6vw, 5px)', marginTop: '1px' }} />
                      )}
                    </div>
                    {hasTrades && (
                      <div className="w-full mt-auto">
                        <div className={`font-black tabular-nums leading-none ${
                          isSelected ? 'text-white' : netPnL >= 0 ? 'text-emerald-600' : 'text-rose-500'
                        }`} style={{ fontSize: 'clamp(6px, 1.1vw, 10px)' }}>
                          {netPnL >= 0 ? '+' : '−'}${Math.abs(Math.floor(netPnL)).toLocaleString()}
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

      {/* Drill-down */}
      {selectedDate && (
        <div className="p-5 md:p-8 apple-glass rounded-[2rem] animate-in slide-in-from-bottom-3 duration-300 ios-shadow border-none">
          <div className="flex items-center justify-between mb-5 border-b border-black/5 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.12em]">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <p className="text-[9px] font-bold text-black/20 uppercase tracking-widest mt-0.5">Daily Log Breakdown</p>
            </div>
            <button onClick={() => setSelectedDate(null)} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors text-black/30 hover:text-black">
              <ICONS.Close className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {tradesByDate[selectedDate]?.map(t => (
              <div key={t.id}>{renderTradeDetail(t)}</div>
            ))}
            {(!tradesByDate[selectedDate] || tradesByDate[selectedDate].length === 0) && (
              <div className="text-center py-16 flex flex-col items-center gap-4 opacity-20">
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
