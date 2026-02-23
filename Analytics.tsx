import React from 'react';
import { Execution } from '../types';
import { ICONS } from '../constants';

interface ExecutionManagerProps {
  executions: Execution[];
  onUpdate: (executions: Execution[]) => void;
  type: 'ENTRY' | 'EXIT';
}

const ExecutionManager: React.FC<ExecutionManagerProps> = ({ executions, onUpdate, type }) => {
  const filteredExecs = executions.filter(e => e.type === type);

  const addExecution = () => {
    const newExec: Execution = {
      id: crypto.randomUUID(),
      type,
      price: 0,
      qty: 0,
      fees: 0,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    };
    onUpdate([...executions, newExec]);
  };

  const updateExec = (id: string, field: keyof Execution, value: any) => {
    const updated = executions.map(e => e.id === id ? { ...e, [field]: value } : e);
    onUpdate(updated);
  };

  const removeExec = (id: string) => {
    onUpdate(executions.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-[9px] font-black uppercase tracking-[0.2em] ${type === 'ENTRY' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {type} Protocol
        </h4>
        <button 
          type="button" 
          onClick={addExecution}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-[8px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
        >
          <ICONS.Plus className="w-2.5 h-2.5" /> Add Fill
        </button>
      </div>

      <div className="space-y-3">
        {filteredExecs.map((exec, idx) => (
          <div key={exec.id} className="bg-white border border-black/[0.05] rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end animate-in slide-in-from-left-2 shadow-sm">
            <div className="grid grid-cols-2 sm:flex sm:flex-1 gap-3">
               <div className="space-y-1">
                 <label className="text-[7px] font-black text-slate-600 uppercase tracking-widest block ml-1">Price</label>
                 <input 
                   type="number" 
                   step="any"
                   value={exec.price || ''} 
                   onChange={(e) => updateExec(exec.id, 'price', parseFloat(e.target.value))}
                   className="w-full bg-slate-50/50 border border-slate-100 rounded-xl p-2.5 text-[11px] font-black outline-none focus:border-black text-black"
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-[7px] font-black text-slate-600 uppercase tracking-widest block ml-1">Qty</label>
                 <input 
                   type="number" 
                   step="any"
                   value={exec.qty || ''} 
                   onChange={(e) => updateExec(exec.id, 'qty', parseFloat(e.target.value))}
                   className="w-full bg-slate-50/50 border border-slate-100 rounded-xl p-2.5 text-[11px] font-black outline-none focus:border-black text-black"
                 />
               </div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-1 gap-3">
               <div className="space-y-1">
                 <label className="text-[7px] font-black text-slate-600 uppercase tracking-widest block ml-1">Fees</label>
                 <input 
                   type="number" 
                   step="any"
                   value={exec.fees || ''} 
                   onChange={(e) => updateExec(exec.id, 'fees', parseFloat(e.target.value))}
                   className="w-full bg-slate-50/50 border border-slate-100 rounded-xl p-2.5 text-[11px] font-black outline-none focus:border-black text-black"
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-[7px] font-black text-slate-600 uppercase tracking-widest block ml-1">Time</label>
                 <input 
                   type="time" 
                   value={exec.time} 
                   onChange={(e) => updateExec(exec.id, 'time', e.target.value)}
                   className="w-full bg-slate-50/50 border border-slate-100 rounded-xl p-2.5 text-[11px] font-black outline-none focus:border-black text-black"
                 />
               </div>
            </div>
            <button 
              type="button" 
              onClick={() => removeExec(exec.id)}
              className="flex items-center justify-center p-3 text-rose-400 hover:text-rose-600 transition-colors h-[48px] sm:h-auto border border-rose-100 sm:border-none rounded-xl bg-rose-50/50 sm:bg-transparent"
            >
              <ICONS.Delete className="w-4 h-4" />
            </button>
          </div>
        ))}

        {filteredExecs.length === 0 && (
          <div className="text-center py-6 border-2 border-dashed border-black/5 rounded-[2rem] opacity-30">
            <p className="text-[9px] font-black uppercase tracking-widest text-black">No protocol data</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionManager;