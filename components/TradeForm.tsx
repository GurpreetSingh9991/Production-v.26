import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trade, Account, Side, AssetType, Bias, Grade, Mistake, Execution, Psychology } from '../types';
import { ICONS, SIDES, ASSET_TYPES, SETUP_TYPES, BIASES, GRADES } from '../constants';
import ExecutionManager from './ExecutionManager';

const COMMON_MISTAKES = [
  'Premature Entry',
  'Premature Exit',
  'Moved Stop Loss',
  'FOMO Entry',
  'Revenge Trade',
  'Didn\'t Follow Plan',
  'Poor Risk Management',
  'Over-leveraged',
  'News Event Overlap'
];

const EMOTIONAL_STATES = [
  'Confident', 'Fearful', 'Calm', 'Anxious', 'FOMO', 'Revenge Trading', 'Bored', 'Excited'
];

const MOOD_EMOJIS = ['☹️', '🙁', '😐', '🙂', '😊'];

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface TradeFormProps {
  onSave: (trade: Trade) => void;
  onCancel: () => void;
  initialData?: Trade | null;
  accounts: Account[];
  activeAccountId: string;
}

const TradeForm: React.FC<TradeFormProps> = ({ onSave, onCancel, initialData, accounts, activeAccountId }) => {
  const [showMistakes, setShowMistakes] = useState(false);
  const [showPsychology, setShowPsychology] = useState(false);
  const [isAdvanced, setIsAdvanced] = useState(false);
  
  // Pip/Tick value for Forex/CFD/Futures
  const [pipValue, setPipValue] = useState(10); // $ per pip per lot (default: EURUSD standard lot)
  const [pipSize, setPipSize] = useState(0.0001); // 1 pip = 0.0001 for most forex pairs
  
  const defaultPsychology: Psychology = {
    moodBefore: 3,
    moodAfter: 3,
    states: [],
    notes: ''
  };

  const [formData, setFormData] = useState<Partial<Trade>>({
    id: generateUUID(),
    accountId: activeAccountId,
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    side: 'LONG',
    assetType: 'STOCKS',
    qty: 1,
    multiplier: 1,
    entryPrice: 0,
    exitPrice: 0,
    stopLossPrice: 0,
    targetPrice: 0,
    entryTime: '09:30',
    exitTime: '10:00',
    duration: '30m',
    pnl: 0,
    rr: 0,
    result: 'WIN',
    resultGrade: 'B' as Grade,
    setupType: 'A',
    weeklyBias: 'SIDEWAYS' as Bias,
    narrative: '',
    chartLink: '',
    tags: [],
    mistakes: [],
    executions: [],
    psychology: defaultPsychology,
    followedPlan: true,
    plan: '',
    total_fees: 2.50,
    gross_pnl: 0,
    net_pnl: 0
  });

  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        psychology: {
          ...defaultPsychology,
          ...(initialData.psychology || {})
        }
      });
      setTagsInput(initialData.tags?.join(', ') || '');
      if (initialData.mistakes && initialData.mistakes.length > 0) setShowMistakes(true);
      if (initialData.executions && initialData.executions.length > 0) setIsAdvanced(true);
      if (initialData.psychology && (initialData.psychology.states?.length || initialData.psychology.notes)) setShowPsychology(true);
    }
  }, [initialData]);

  useEffect(() => {
    const mult = Number(formData.multiplier) || 1;
    let entry = Number(formData.entryPrice) || 0;
    let exit = Number(formData.exitPrice) || 0;
    let qty = Number(formData.qty) || 0;
    let fees = Number(formData.total_fees) || 0;

    if (isAdvanced && formData.executions && formData.executions.length > 0) {
      const entries = formData.executions.filter(e => e.type === 'ENTRY');
      const exits = formData.executions.filter(e => e.type === 'EXIT');

      const totalEntryQty = entries.reduce((s, e) => s + (e.qty || 0), 0);
      const weightedEntrySum = entries.reduce((s, e) => s + ((e.price || 0) * (e.qty || 0)), 0);
      const avgEntry = totalEntryQty > 0 ? weightedEntrySum / totalEntryQty : 0;

      const totalExitQty = exits.reduce((s, e) => s + (e.qty || 0), 0);
      const weightedExitSum = exits.reduce((s, e) => s + ((e.price || 0) * (e.qty || 0)), 0);
      const avgExit = totalExitQty > 0 ? weightedExitSum / totalExitQty : 0;

      const totalFees = formData.executions.reduce((s, e) => s + (e.fees || 0), 0);

      entry = avgEntry;
      exit = avgExit;
      qty = totalEntryQty;
      fees = totalFees;

      setFormData(prev => ({
        ...prev,
        entryPrice: parseFloat(avgEntry.toFixed(5)),
        exitPrice: parseFloat(avgExit.toFixed(5)),
        qty: totalEntryQty,
        total_fees: parseFloat(totalFees.toFixed(2)),
        average_entry: avgEntry,
        average_exit: avgExit
      }));
    }

    const sl = Number(formData.stopLossPrice) || 0;
    const tp = Number(formData.targetPrice) || 0;
    
    if (entry !== 0 && exit !== 0) {
      let diff = formData.side === 'LONG' ? (exit - entry) : (entry - exit);
      let calculatedGross: number;
      let calculatedPips: number | undefined;

      if (formData.assetType === 'FOREX') {
        // Forex: PnL = (price_diff / pip_size) × pip_value × lots
        const pips = diff / pipSize;
        calculatedPips = parseFloat(pips.toFixed(1));
        calculatedGross = pips * pipValue * qty;
      } else if (formData.assetType === 'FUTURES') {
        // Futures: PnL = (price_diff / tick_size) × tick_value × contracts
        const ticks = diff / pipSize;
        calculatedPips = parseFloat(ticks.toFixed(0));
        calculatedGross = ticks * pipValue * qty;
      } else {
        // Stocks: PnL = price_diff × qty × multiplier
        calculatedGross = diff * qty * mult;
      }

      let calculatedNet = calculatedGross - fees;
      
      setFormData(prev => ({
        ...prev,
        gross_pnl: Number(calculatedGross.toFixed(2)),
        pnl: Number(calculatedNet.toFixed(2)),
        net_pnl: Number(calculatedNet.toFixed(2)),
        result: calculatedNet > 0.01 ? 'WIN' : (calculatedNet < -0.01 ? 'LOSS' : 'BE'),
        ...(calculatedPips !== undefined ? { pips: calculatedPips } : {})
      }));
    }

    if (entry !== 0 && sl !== 0 && tp !== 0) {
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(tp - entry);
      if (risk > 0) {
        const calculatedRR = reward / risk;
        setFormData(prev => ({ ...prev, rr: Number(calculatedRR.toFixed(2)) }));
      }
    }
  }, [formData.executions, isAdvanced, formData.entryPrice, formData.exitPrice, formData.stopLossPrice, formData.targetPrice, formData.qty, formData.side, formData.multiplier, formData.total_fees, formData.assetType, pipValue, pipSize]);

  // ── Smart Asset / Pip / Tick detector ──────────────────────────────────
  const TICK_MAP: Record<string, { tick: number; value: number; label: string }> = {
    // Equity Index Futures
    ES:  { tick: 0.25,     value: 12.50,  label: 'S&P 500 E-mini' },
    MES: { tick: 0.25,     value: 1.25,   label: 'S&P 500 Micro' },
    NQ:  { tick: 0.25,     value: 5.00,   label: 'Nasdaq E-mini' },
    MNQ: { tick: 0.25,     value: 0.50,   label: 'Nasdaq Micro' },
    YM:  { tick: 1,        value: 5.00,   label: 'Dow Jones E-mini' },
    MYM: { tick: 1,        value: 0.50,   label: 'Dow Jones Micro' },
    RTY: { tick: 0.10,     value: 5.00,   label: 'Russell 2000' },
    M2K: { tick: 0.10,     value: 0.50,   label: 'Russell 2000 Micro' },
    // Energy
    CL:  { tick: 0.01,     value: 10.00,  label: 'Crude Oil' },
    MCL: { tick: 0.01,     value: 1.00,   label: 'Micro Crude Oil' },
    NG:  { tick: 0.001,    value: 10.00,  label: 'Natural Gas' },
    RB:  { tick: 0.0001,   value: 4.20,   label: 'RBOB Gasoline' },
    // Metals
    GC:  { tick: 0.10,     value: 10.00,  label: 'Gold' },
    MGC: { tick: 0.10,     value: 1.00,   label: 'Micro Gold' },
    SI:  { tick: 0.005,    value: 25.00,  label: 'Silver' },
    HG:  { tick: 0.0005,   value: 12.50,  label: 'Copper' },
    PL:  { tick: 0.10,     value: 5.00,   label: 'Platinum' },
    PA:  { tick: 0.05,     value: 5.00,   label: 'Palladium' },
    // Agriculture
    ZC:  { tick: 0.25,     value: 12.50,  label: 'Corn' },
    ZW:  { tick: 0.25,     value: 12.50,  label: 'Wheat' },
    ZS:  { tick: 0.25,     value: 12.50,  label: 'Soybeans' },
    ZL:  { tick: 0.0001,   value: 0.60,   label: 'Soybean Oil' },
    ZM:  { tick: 0.10,     value: 1.00,   label: 'Soybean Meal' },
    LE:  { tick: 0.00025,  value: 10.00,  label: 'Live Cattle' },
    HE:  { tick: 0.00025,  value: 10.00,  label: 'Lean Hogs' },
    // Treasury Bonds
    ZB:  { tick: 0.03125,  value: 31.25,  label: '30Y T-Bond' },
    ZN:  { tick: 0.015625, value: 15.625, label: '10Y T-Note' },
    ZF:  { tick: 0.0078125,value: 7.8125, label: '5Y T-Note' },
    ZT:  { tick: 0.0039063,value: 3.9063, label: '2Y T-Note' },
    // Forex Futures
    '6E': { tick: 0.00005, value: 6.25,   label: 'EUR/USD Futures' },
    '6B': { tick: 0.0001,  value: 6.25,   label: 'GBP/USD Futures' },
    '6J': { tick: 0.0000005,value: 6.25,  label: 'USD/JPY Futures' },
    '6C': { tick: 0.00005, value: 5.00,   label: 'CAD/USD Futures' },
    '6A': { tick: 0.0001,  value: 10.00,  label: 'AUD/USD Futures' },
    // Crypto
    BTC: { tick: 5.00,     value: 25.00,  label: 'Bitcoin Futures' },
    ETH: { tick: 0.25,     value: 12.50,  label: 'Ether Futures' },
    MBT: { tick: 5.00,     value: 2.50,   label: 'Micro Bitcoin' },
  };

  const FOREX_CURRENCIES = ['USD','EUR','GBP','AUD','NZD','CAD','CHF','JPY','SGD','HKD','NOK','SEK','DKK','MXN','ZAR','TRY','CNH','PLN','CZK','HUF'];

  const detectAssetFromSymbol = (sym: string): {
    assetType: 'STOCKS' | 'FOREX' | 'FUTURES';
    pipSize?: number;
    pipValueHint?: number;
    label?: string;
  } => {
    const s = sym.toUpperCase().trim();
    if (!s) return { assetType: 'STOCKS' };

    // ── Forex: any 6-char pair like EURUSD, GBPJPY, USDJPY, XAUUSD etc.
    if (s.length === 6) {
      const base = s.slice(0, 3);
      const quote = s.slice(3, 6);
      const metals = ['XAU','XAG','XPT','XPD'];
      if (
        (FOREX_CURRENCIES.includes(base) && FOREX_CURRENCIES.includes(quote)) ||
        (metals.includes(base) && FOREX_CURRENCIES.includes(quote))
      ) {
        const isJPY = quote === 'JPY' || base === 'JPY';
        const isXAU = metals.includes(base);
        return {
          assetType: 'FOREX',
          pipSize: isJPY ? 0.01 : isXAU ? 0.01 : 0.0001,
          pipValueHint: 10,
          label: `${base}/${quote}`,
        };
      }
    }

    // ── Futures: strip expiry codes (e.g. ESH25 → ES, CLM24 → CL)
    // Strip trailing month code (letter) + year digits
    const stripped = s.replace(/([A-Z]{1,2})([FGHJKMNQUVXZ]\d{2})$/, '$1').replace(/\d+$/, '');
    if (TICK_MAP[stripped]) {
      const t = TICK_MAP[stripped];
      return { assetType: 'FUTURES', pipSize: t.tick, pipValueHint: t.value, label: t.label };
    }
    // Also try the raw symbol (for 2-letter codes like ES, NQ typed without expiry)
    if (TICK_MAP[s]) {
      const t = TICK_MAP[s];
      return { assetType: 'FUTURES', pipSize: t.tick, pipValueHint: t.value, label: t.label };
    }

    return { assetType: 'STOCKS' };
  };

  // Sync pip/tick values when assetType or symbol changes on existing trade load
  useEffect(() => {
    if (initialData?.symbol) {
      const detected = detectAssetFromSymbol(initialData.symbol);
      if (detected.pipSize) setPipSize(detected.pipSize);
      if (detected.pipValueHint) setPipValue(detected.pipValueHint);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.symbol]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    // For symbol changes: detect asset type and update everything in ONE setFormData call
    if (name === 'symbol' && value.length >= 2) {
      const detected = detectAssetFromSymbol(value);
      if (detected.pipSize) setPipSize(detected.pipSize);
      if (detected.pipValueHint) setPipValue(detected.pipValueHint);
      setFormData(prev => ({
        ...prev,
        symbol: value.toUpperCase(),
        assetType: detected.assetType,
      }));
      return; // don't fall through to generic handler
    }

    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTagsInput(val);
    const tagArray = val.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    setFormData(prev => ({ ...prev, tags: tagArray }));
  };

  const handleExecutionsUpdate = (execs: Execution[]) => {
    setFormData(prev => ({ ...prev, executions: execs }));
  };

  const handlePsychologyUpdate = (field: keyof Psychology, value: any) => {
    setFormData(prev => ({
      ...prev,
      psychology: { ...(prev.psychology || defaultPsychology), [field]: value }
    }));
  };

  const toggleState = (state: string) => {
    const currentStates = formData.psychology?.states || [];
    const newStates = currentStates.includes(state) 
      ? currentStates.filter(s => s !== state)
      : [...currentStates, state];
    handlePsychologyUpdate('states', newStates);
  };

  const toggleAdvanced = () => {
    if (!isAdvanced) {
      const initialExecs: Execution[] = [
        { id: generateUUID(), type: 'ENTRY', price: formData.entryPrice || 0, qty: formData.qty || 1, fees: (formData.total_fees || 0) / 2, time: formData.entryTime || '09:30' },
        { id: generateUUID(), type: 'EXIT', price: formData.exitPrice || 0, qty: formData.qty || 1, fees: (formData.total_fees || 0) / 2, time: formData.exitTime || '10:00' }
      ];
      setFormData(prev => ({ ...prev, executions: initialExecs }));
    }
    setIsAdvanced(!isAdvanced);
  };

  const addMistake = () => {
    setFormData(prev => ({
      ...prev,
      mistakes: [...(prev.mistakes || []), { type: COMMON_MISTAKES[0], description: '', lesson: '' }]
    }));
  };

  const updateMistake = (index: number, field: keyof Mistake, value: string) => {
    const updated = [...(formData.mistakes || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, mistakes: updated }));
  };

  const removeMistake = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mistakes: (prev.mistakes || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];

    if (!formData.symbol?.trim()) {
      errors.push('Symbol is required');
    }
    if (!formData.date) {
      errors.push('Date is required');
    }
    if (!formData.qty || Number(formData.qty) <= 0) {
      errors.push('Quantity must be greater than 0');
    }
    if (!formData.entryPrice || Number(formData.entryPrice) <= 0) {
      errors.push('Entry price must be greater than 0');
    }
    if (!formData.exitPrice || Number(formData.exitPrice) <= 0) {
      errors.push('Exit price must be greater than 0');
    }
    if (
      Number(formData.entryPrice) > 0 &&
      Number(formData.exitPrice) > 0 &&
      Number(formData.entryPrice) === Number(formData.exitPrice)
    ) {
      errors.push('Entry and exit price cannot be identical');
    }

    if (errors.length > 0) {
      alert('Please fix the following before saving:\n\n• ' + errors.join('\n• '));
      return;
    }

    onSave(formData as Trade);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 pt-safe pb-safe overflow-hidden">
      <div className="bg-white/80 backdrop-blur-2xl w-full max-w-4xl rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-white/20 relative animate-in slide-in-from-bottom sm:zoom-in-95 overflow-hidden flex flex-col h-[92vh] sm:max-h-[85vh]">
        
        {/* Dynamic Profit Pill */}
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full shadow-2xl border flex items-center gap-4 transition-all duration-500 z-50 ${
          formData.pnl! > 0 ? 'bg-emerald-500 border-emerald-400 text-white' : 
          formData.pnl! < 0 ? 'bg-rose-500 border-rose-400 text-white' : 'bg-black border-slate-800 text-white'
        }`}>
          <div className="flex flex-col items-center">
            <span className="text-[7px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">Session Net</span>
            <span className="text-xs sm:text-sm font-black font-mono leading-none">
              {formData.pnl! >= 0 ? '+' : '-'}${Math.abs(formData.pnl!).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-[1px] h-4 bg-white/20" />
          <div className="flex flex-col items-center">
            <span className="text-[7px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">RR Multiplier</span>
            <span className="text-[10px] font-black leading-none">{formData.rr || 0}R</span>
          </div>
        </div>

        {/* Form Header */}
        <div className="p-6 sm:p-8 pb-4 sm:pb-6 border-b border-black/[0.05] flex justify-between items-end bg-white/40 flex-shrink-0 pt-16">
          <div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-none text-black">Journal Protocol</h2>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-700 uppercase tracking-widest mt-1">Session Data Serialization</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={toggleAdvanced}
              className={`px-3 sm:px-4 py-2 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${isAdvanced ? 'bg-emerald-500 text-white shadow-md' : 'bg-black/5 text-black/60 hover:bg-black/10'}`}
            >
              {isAdvanced ? 'Advanced' : 'Simple'}
            </button>
            <button type="button" onClick={onCancel} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors text-black/40 hover:text-black"><ICONS.Close className="w-6 h-6" /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 custom-scrollbar">
          
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-black/60 uppercase tracking-[0.3em] flex items-center gap-2">
              <div className="w-1 h-3 bg-black/40 rounded-full" /> Session Context
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-1.5">
                <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Account</label>
                <select name="accountId" value={formData.accountId} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[11px] font-black outline-none h-[48px] focus:ring-2 focus:ring-black/5 text-black">
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">HTF Bias</label>
                <div className="flex gap-1 p-1 bg-slate-100/50 border border-slate-200 rounded-xl h-[48px]">
                  {BIASES.map(b => (
                    <button key={b} type="button" onClick={() => setFormData(p => ({...p, weeklyBias: b as Bias}))} className={`flex-1 rounded-lg text-[9px] font-black transition-all ${formData.weeklyBias === b ? 'bg-black text-white' : 'text-slate-500 hover:text-black'}`}>{b}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Setup</label>
                <div className="flex gap-1 p-1 bg-slate-100/50 border border-slate-200 rounded-xl h-[48px]">
                  {SETUP_TYPES.map(s => (
                    <button key={s} type="button" onClick={() => setFormData(p => ({...p, setupType: s}))} className={`flex-1 rounded-lg text-[10px] font-black transition-all ${formData.setupType === s ? 'bg-black text-white' : 'text-slate-500 hover:text-black'}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-black/60 uppercase tracking-[0.3em] flex items-center gap-2">
              <div className="w-1 h-3 bg-black/40 rounded-full" /> Discipline Protocol
            </h3>
            <div className="bg-white/60 backdrop-blur-md border border-black/[0.05] p-6 rounded-[2rem] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                   <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Plan Compliance</label>
                   <p className="text-[10px] font-bold text-black/80 italic">Did you execute according to your pre-defined rules?</p>
                </div>
                <div className="flex gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl h-[44px] w-48">
                  <button 
                    type="button" 
                    onClick={() => setFormData(p => ({...p, followedPlan: true}))} 
                    className={`flex-1 rounded-lg text-[9px] font-black transition-all ${formData.followedPlan ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-black'}`}
                  >
                    YES
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFormData(p => ({...p, followedPlan: false}))} 
                    className={`flex-1 rounded-lg text-[9px] font-black transition-all ${formData.followedPlan === false ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-500 hover:text-black'}`}
                  >
                    DEVIATED
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Pre-Trade Intent</label>
                <input 
                  type="text" 
                  name="plan" 
                  value={formData.plan} 
                  onChange={handleChange} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold outline-none h-[48px] text-black" 
                  placeholder="The play..." 
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-black/60 uppercase tracking-[0.3em] flex items-center gap-2">
              <div className="w-1 h-3 bg-black/40 rounded-full" /> Market Logistics & Fill Data
            </h3>
            
            {isAdvanced ? (
              <div className="space-y-8 bg-slate-50/50 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-black/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-1.5">
                    <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Symbol</label>
                    <input type="text" name="symbol" value={formData.symbol} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none uppercase h-[48px] text-black" placeholder="BTCUSD" required />
                    {/* Smart asset type badge */}
                    {formData.symbol && formData.symbol.length >= 2 && (
                      <div className={`mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit animate-in fade-in duration-300 ${
                        formData.assetType === 'FOREX'   ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                        formData.assetType === 'FUTURES' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-black/5 text-black/40 border border-black/5'
                      }`}>
                        {formData.assetType === 'FOREX' ? '💱 Forex · Pip Mode' : formData.assetType === 'FUTURES' ? '📈 Futures · Tick Mode' : '📊 Stocks · Share Mode'}
                      </div>
                    )}
                    {/* Smart asset type badge */}
                    {formData.symbol && formData.symbol.length >= 2 && (
                      <div className={`mt-1 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest w-fit transition-all animate-in fade-in duration-300 ${
                        formData.assetType === 'FOREX'   ? 'bg-blue-50 text-blue-600' :
                        formData.assetType === 'FUTURES' ? 'bg-amber-50 text-amber-700' :
                        'bg-black/5 text-black/40'
                      }`}>
                        <span>{formData.assetType === 'FOREX' ? '💱' : formData.assetType === 'FUTURES' ? '📈' : '📊'}</span>
                        {formData.assetType === 'FOREX' ? 'Forex' : formData.assetType === 'FUTURES' ? 'Futures' : 'Stocks'} detected
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Side</label>
                    <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl h-[48px]">
                      {SIDES.map(s => (
                        <button key={s} type="button" onClick={() => setFormData(p => ({...p, side: s as Side}))} className={`flex-1 rounded-lg text-[10px] font-black transition-all ${formData.side === s ? (s === 'LONG' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'text-slate-500'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-10">
                  <ExecutionManager executions={formData.executions || []} onUpdate={handleExecutionsUpdate} type="ENTRY" />
                  <div className="h-px bg-black/5" />
                  <ExecutionManager executions={formData.executions || []} onUpdate={handleExecutionsUpdate} type="EXIT" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                  <StatSummary label="Avg Entry" value={`$${formData.entryPrice?.toLocaleString() || 0}`} />
                  <StatSummary label="Avg Exit" value={`$${formData.exitPrice?.toLocaleString() || 0}`} />
                  <StatSummary label="Qty" value={formData.qty?.toString() || '0'} />
                  <StatSummary label="Fees" value={`$${formData.total_fees?.toLocaleString() || 0}`} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Symbol</label>
                  <input type="text" name="symbol" value={formData.symbol} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none uppercase h-[48px] text-black" placeholder="BTCUSD" required />
                    {/* Smart asset type badge */}
                    {formData.symbol && formData.symbol.length >= 2 && (
                      <div className={`mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit animate-in fade-in duration-300 ${
                        formData.assetType === 'FOREX'   ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                        formData.assetType === 'FUTURES' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-black/5 text-black/40 border border-black/5'
                      }`}>
                        {formData.assetType === 'FOREX' ? '💱 Forex · Pip Mode' : formData.assetType === 'FUTURES' ? '📈 Futures · Tick Mode' : '📊 Stocks · Share Mode'}
                      </div>
                    )}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Side</label>
                  <div className="flex gap-1 p-1 bg-slate-100/50 border border-slate-200 rounded-xl h-[48px]">
                    {SIDES.map(s => (
                      <button key={s} type="button" onClick={() => setFormData(p => ({...p, side: s as Side}))} className={`flex-1 rounded-lg text-[10px] font-black transition-all ${formData.side === s ? (s === 'LONG' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'text-slate-500'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">
                    {formData.assetType === 'FOREX' ? 'Lots' : formData.assetType === 'FUTURES' ? 'Contracts' : 'Shares'}
                  </label>
                  <input type="number" name="qty" value={formData.qty} onChange={handleChange} step="any" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none h-[48px] text-black" required />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Entry Price</label>
                  <input type="number" name="entryPrice" value={formData.entryPrice} onChange={handleChange} step="any" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none h-[48px] text-black" required />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div 
              className="flex items-center justify-between cursor-pointer group py-2"
              onClick={() => setShowPsychology(!showPsychology)}
            >
              <h3 className="text-[10px] font-black text-violet-600 uppercase tracking-[0.3em] flex items-center gap-2">
                <div className="w-1 h-3 bg-violet-600 rounded-full" /> Psychological Biometrics
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">
                  {showPsychology ? 'Hide' : 'Monitor'}
                </span>
                <ICONS.ToggleRight className={`w-3.5 h-3.5 text-violet-600 transition-transform duration-500 ${showPsychology ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {showPsychology && (
              <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                <div className="bg-violet-50/50 border border-violet-100 p-4 sm:p-6 rounded-[2rem] space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1 text-center sm:text-left">Pre-Trade Mood</label>
                      <div className="flex justify-between gap-1 p-1 bg-white rounded-2xl border border-violet-100">
                        {MOOD_EMOJIS.map((emoji, i) => (
                          <button 
                            key={i} 
                            type="button"
                            onClick={() => handlePsychologyUpdate('moodBefore', i + 1)}
                            className={`flex-1 py-3 text-lg rounded-xl transition-all ${formData.psychology?.moodBefore === i + 1 ? 'bg-violet-500 shadow-lg scale-110' : 'hover:bg-violet-50'}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1 text-center sm:text-left">Post-Trade Mood</label>
                      <div className="flex justify-between gap-1 p-1 bg-white rounded-2xl border border-violet-100">
                        {MOOD_EMOJIS.map((emoji, i) => (
                          <button 
                            key={i} 
                            type="button"
                            onClick={() => handlePsychologyUpdate('moodAfter', i + 1)}
                            className={`flex-1 py-3 text-lg rounded-xl transition-all ${formData.psychology?.moodAfter === i + 1 ? 'bg-violet-500 shadow-lg scale-110' : 'hover:bg-violet-50'}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Internal States</label>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {EMOTIONAL_STATES.map(state => (
                        <button
                          key={state}
                          type="button"
                          onClick={() => toggleState(state)}
                          className={`px-3 sm:px-4 py-2 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all border ${
                            formData.psychology?.states?.includes(state) 
                            ? 'bg-violet-500 text-white border-violet-400 shadow-md' 
                            : 'bg-white text-slate-500 border-slate-100'
                          }`}
                        >
                          {state}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-black/60 uppercase tracking-[0.3em] flex items-center gap-2">
              <div className="w-1 h-3 bg-rose-500 rounded-full" /> Risk & Reward Engine
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 bg-slate-50/50 p-4 sm:p-6 rounded-[2rem] border border-slate-100">
              <div className="space-y-1.5">
                <label className="block text-[8px] font-black text-rose-500 uppercase tracking-widest ml-1">Stop Loss</label>
                <input type="number" name="stopLossPrice" value={formData.stopLossPrice} onChange={handleChange} step="any" className="w-full bg-white border border-rose-100 rounded-xl p-3 text-sm font-black outline-none h-[48px] text-black" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[8px] font-black text-emerald-600 uppercase tracking-widest ml-1">Target</label>
                <input type="number" name="targetPrice" value={formData.targetPrice} onChange={handleChange} step="any" className="w-full bg-white border border-emerald-100 rounded-xl p-3 text-sm font-black outline-none h-[48px] text-black" />
              </div>
              {!isAdvanced && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Exit Price</label>
                    <input type="number" name="exitPrice" value={formData.exitPrice} onChange={handleChange} step="any" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none h-[48px] text-black" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[8px] font-black text-amber-600 uppercase tracking-widest ml-1">Fees ($)</label>
                    <input type="number" name="total_fees" value={formData.total_fees} onChange={handleChange} step="any" className="w-full bg-white border border-amber-100 rounded-xl p-3 text-sm font-black outline-none h-[48px] text-black" />
                  </div>
                </>
              )}
              <div className={`space-y-1.5 ${isAdvanced ? 'sm:col-span-2 md:col-span-3 lg:col-span-3' : 'sm:col-span-2 md:col-span-1'}`}>
                <label className="block text-[8px] font-black text-black/60 uppercase tracking-widest ml-1">Yield Profile</label>
                <div className="w-full bg-black text-white rounded-xl p-3 text-sm font-black flex items-center justify-center h-[48px] shadow-lg">
                  {formData.rr || 0}R
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div 
              className="flex items-center justify-between cursor-pointer group py-2"
              onClick={() => setShowMistakes(!showMistakes)}
            >
              <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em] flex items-center gap-2">
                <div className="w-1 h-3 bg-rose-500 rounded-full" /> Psychological Friction
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">
                  {showMistakes ? 'Hide' : 'Report'}
                </span>
                <ICONS.ToggleRight className={`w-3.5 h-3.5 text-rose-600 transition-transform duration-500 ${showMistakes ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {showMistakes && (
              <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                <div className="bg-rose-50/50 border border-rose-100 p-4 sm:p-6 rounded-[2rem] space-y-4">
                  {(formData.mistakes || []).map((mistake, idx) => (
                    <div key={idx} className="bg-white p-4 sm:p-6 rounded-2xl border border-rose-100 shadow-sm relative group">
                      <button type="button" onClick={() => removeMistake(idx)} className="absolute top-4 right-4 text-rose-300 hover:text-rose-500 p-2"><ICONS.Close className="w-4 h-4" /></button>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Mistake Category</label>
                          <select value={mistake.type} onChange={(e) => updateMistake(idx, 'type', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-black outline-none text-black">
                            {COMMON_MISTAKES.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Description</label>
                            <textarea value={mistake.description} onChange={(e) => updateMistake(idx, 'description', e.target.value)} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] outline-none resize-none font-semibold italic text-black" placeholder="The lapse..." />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[8px] font-black text-emerald-600 uppercase tracking-widest ml-1">Lesson</label>
                            <textarea value={mistake.lesson} onChange={(e) => updateMistake(idx, 'lesson', e.target.value)} rows={2} className="w-full bg-emerald-50/20 border border-emerald-100 rounded-xl p-3 text-[11px] outline-none resize-none font-semibold italic text-black" placeholder="Next time..." />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addMistake} className="w-full py-5 border-2 border-dashed border-rose-200 rounded-2xl text-[9px] font-black text-rose-500 uppercase tracking-widest active:scale-95 transition-all">+ New Friction Entry</button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-black/60 uppercase tracking-[0.3em] flex items-center gap-2">
              <div className="w-1 h-3 bg-black/40 rounded-full" /> Analysis & Proof
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6">
              <div className="sm:col-span-8 space-y-1.5">
                <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Tags (Comma Separated)</label>
                <input type="text" value={tagsInput} onChange={handleTagsChange} placeholder="Breakout, News, FOMO" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[11px] font-bold outline-none h-[48px] text-black" />
              </div>
              <div className="sm:col-span-4 space-y-1.5">
                <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Grade</label>
                <div className="flex gap-1 p-1 bg-slate-100/50 border border-slate-200 rounded-xl h-[48px]">
                  {GRADES.map(g => (
                    <button key={g} type="button" onClick={() => setFormData(p => ({...p, resultGrade: g as Grade}))} className={`flex-1 rounded-lg text-[10px] font-black transition-all ${formData.resultGrade === g ? 'bg-black text-white shadow-md' : 'text-slate-500 hover:text-black'}`}>{g}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {(formData.assetType === 'FOREX' || formData.assetType === 'FUTURES') ? (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">
                      {formData.assetType === 'FOREX' ? 'Pip Value ($)' : 'Tick Value ($)'}
                      <span className="text-black/30 normal-case ml-1">per {formData.assetType === 'FOREX' ? 'pip' : 'tick'} per lot</span>
                    </label>
                    <input
                      type="number"
                      value={pipValue}
                      onChange={e => setPipValue(parseFloat(e.target.value) || 10)}
                      step="any"
                      min="0"
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none h-[48px] text-black"
                      placeholder={formData.assetType === 'FOREX' ? '10' : '12.50'}
                    />
                    <p className="text-[8px] text-black/30 ml-1">
                      {formData.assetType === 'FOREX' 
                        ? 'Standard: $10/pip (1 lot EURUSD). Mini lot = $1/pip' 
                        : 'e.g. ES Futures = $12.50/tick, NQ = $5/tick'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">
                      {formData.assetType === 'FOREX' ? 'Pip Size' : 'Tick Size'}
                    </label>
                    <input
                      type="number"
                      value={pipSize}
                      onChange={e => setPipSize(parseFloat(e.target.value) || 0.0001)}
                      step="any"
                      min="0.00001"
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none h-[48px] text-black"
                      placeholder={formData.assetType === 'FOREX' ? '0.0001' : '0.25'}
                    />
                    <p className="text-[8px] text-black/30 ml-1">
                      {formData.assetType === 'FOREX'
                        ? 'Most pairs: 0.0001 | JPY pairs: 0.01'
                        : 'ES/NQ: 0.25 | Crude Oil: 0.01'}
                    </p>
                  </div>
                  {formData.pips !== undefined && formData.pips !== 0 && (
                    <div className="sm:col-span-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                        {formData.assetType === 'FOREX' ? '📊 Pips' : '📊 Ticks'}: {formData.pips}
                      </span>
                      <span className="text-[10px] text-emerald-600 ml-auto">Auto-calculated from entry/exit</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Asset Multiplier</label>
                  <input type="number" name="multiplier" value={formData.multiplier} onChange={handleChange} step="any" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black outline-none h-[48px] text-black" />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Snapshot URL</label>
                <input type="url" name="chartLink" value={formData.chartLink} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[11px] font-mono outline-none h-[48px] text-black" placeholder="TradingView Link" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Narrative</label>
              <textarea name="narrative" value={formData.narrative} onChange={handleChange} rows={4} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-[13px] outline-none resize-none leading-relaxed italic font-semibold shadow-sm text-black" placeholder="The story of the trade..." />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 pb-12 sm:pb-6">
            <button type="submit" className="w-full py-5 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all order-1 sm:order-2 hover:brightness-110">Commit Entry</button>
            <button type="button" onClick={onCancel} className="w-full py-5 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:text-black transition-all order-2 sm:order-1">Abort</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StatSummary = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white p-2.5 rounded-2xl border border-black/5 flex flex-col items-center justify-center shadow-sm">
    <span className="text-[6px] font-black text-slate-700 uppercase tracking-widest block mb-1">{label}</span>
    <span className="text-[9px] font-black text-black truncate w-full text-center">{value}</span>
  </div>
);

export default TradeForm;