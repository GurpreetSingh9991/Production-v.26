import React, { useState } from 'react';
import { Account } from '../types';
import { ICONS } from '../constants';
import { deleteSupabaseAccount } from '../services/supabase';

interface AccountManagerProps {
  accounts: Account[];
  onSave: (accounts: Account[]) => void;
  onClose: () => void;
  plan?: 'free' | 'pro';
  isFirstSetup?: boolean;
}

const AccountManager: React.FC<AccountManagerProps> = ({ accounts, onSave, onClose, plan = 'free', isFirstSetup = false }) => {
  const [editingAccounts, setEditingAccounts] = useState<Account[]>(accounts);
  const [showAdd, setShowAdd] = useState(isFirstSetup); // Auto-open on first setup
  const [newAccount, setNewAccount] = useState({ name: '', balance: 0, color: '#000000' });
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const canAddMore = plan === 'pro' || editingAccounts.length < 1;

  const handleAdd = () => {
    if (!newAccount.name) return;
    if (!canAddMore) {
      alert("🔒 Free plan is limited to 1 account.\n\nUpgrade to Pro ($8.99/mo) to add unlimited broker accounts and trade across multiple scopes.");
      return;
    }
    const acc: Account = {
      id: crypto.randomUUID(),
      name: newAccount.name,
      initialBalance: Number(newAccount.balance),
      currency: 'USD',
      color: newAccount.color,
      createdAt: new Date().toISOString()
    };
    const updated = [...editingAccounts, acc];
    setEditingAccounts(updated);
    onSave(updated);
    setShowAdd(false);
    setNewAccount({ name: '', balance: 0, color: '#000000' });
  };

  const handleConfirmDelete = async (id: string) => {
    console.log("UI: Executing confirmed deletion for account ID:", id);
    
    setIsDeletingId(id);
    setPendingDeleteId(null);
    
    try {
      const result = await deleteSupabaseAccount(id);
      
      if (result.success && result.count > 0) {
        console.log("UI: Account deleted successfully from server.");
        const updated = editingAccounts.filter(a => a.id !== id);
        setEditingAccounts(updated);
        onSave(updated);
      } else if (result.success && result.count === 0) {
        console.warn("UI: Server returned success but 0 rows were deleted.");
        const force = window.confirm(
          "The server reported success but no rows were deleted. This usually indicates an ownership/RLS issue.\n\nForce-remove from local view?"
        );
        if (force) {
          const updated = editingAccounts.filter(a => a.id !== id);
          setEditingAccounts(updated);
          onSave(updated);
        }
      } else {
        console.error("UI: Deletion rejected by backend.", result.error);
        if (result.error?.code === '23503') {
           alert("Cannot delete: This account has trades linked to it.\n\nMake sure your Supabase trades table has ON DELETE CASCADE set for account_id. Check full_setup.sql.");
        } else {
           const errMsg = result.error?.message || "Unknown error";
           alert(`Deletion failed: ${errMsg}\n\nCheck your Supabase connection and try again.`);
        }
      }
    } catch (err: any) {
      console.error("UI: Network error during deletion:", err);
      alert(`Connection error: ${err.message || "Check your internet connection and try again."}`);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/40 backdrop-blur-md z-[150] flex items-center justify-center p-4 pt-safe pb-safe">
      <div className="apple-glass w-full max-w-lg rounded-[3rem] shadow-2xl border border-white overflow-hidden animate-in zoom-in-95">
        <div className="p-8 border-b border-black/5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-black">{isFirstSetup ? 'Welcome! Set Up Your Account' : 'Account Hub'}</h2>
            {isFirstSetup && (
              <p className="text-[10px] text-black/50 font-semibold mt-1">Add your trading account to get started — you can always add more later.</p>
            )}
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] mt-1">Multi-Broker Management</p>
          </div>
          <button onClick={onClose} className="text-black/30 hover:text-black transition-colors p-2"><ICONS.Close className="w-6 h-6" /></button>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {editingAccounts.map(acc => (
            <div key={acc.id} className={`ceramic-white p-5 rounded-[2rem] flex items-center justify-between group transition-all ${isDeletingId === acc.id ? 'opacity-50 scale-[0.98]' : 'hover:scale-[1.01]'}`}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0" style={{ backgroundColor: acc.color }}>
                  <ICONS.Zap className="w-5 h-5 text-white" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-bold truncate text-black">{acc.name}</h4>
                  <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest">${acc.initialBalance.toLocaleString()} Equity</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                {pendingDeleteId === acc.id ? (
                  <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setPendingDeleteId(null); }}
                      className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleConfirmDelete(acc.id); }}
                      className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDeletingId) return;
                      setPendingDeleteId(acc.id);
                    }} 
                    disabled={isDeletingId !== null}
                    className={`p-3 rounded-xl transition-all disabled:opacity-50 active:scale-90 ${isDeletingId === acc.id ? 'text-black/20' : 'text-rose-500 hover:bg-rose-50'}`}
                    title="Delete Account"
                  >
                    {isDeletingId === acc.id ? <ICONS.Sync className="w-5 h-5 animate-spin" /> : <ICONS.Delete className="w-5 h-5" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {editingAccounts.length === 0 && !showAdd && (
            <div className="text-center py-10 opacity-20">
              <ICONS.Dollar className="w-10 h-10 mx-auto mb-2 text-black" />
              <p className="text-[10px] font-black uppercase tracking-widest text-black">No accounts registered</p>
            </div>
          )}

          {showAdd ? (
            <div className="bg-black/5 p-6 rounded-[2rem] space-y-4 animate-in slide-in-from-top-2 border border-black/5">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/30 ml-2">Display Name</label>
                <input 
                  type="text" 
                  placeholder="Prop Firm X, Personal, etc."
                  value={newAccount.name}
                  onChange={e => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white border border-black/5 rounded-xl p-3 text-xs font-bold outline-none focus:border-black transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/30 ml-2">Starting Capital</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={newAccount.balance || ''}
                  onChange={e => setNewAccount(prev => ({ ...prev, balance: Number(e.target.value) }))}
                  className="w-full bg-white border border-black/5 rounded-xl p-3 text-xs font-bold outline-none focus:border-black transition-colors"
                />
              </div>
              <div className="flex items-center justify-between px-2">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/30">Interface Color</label>
                <input 
                  type="color" 
                  value={newAccount.color}
                  onChange={e => setNewAccount(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 rounded-xl overflow-hidden border-none bg-transparent cursor-pointer"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-[9px] font-black uppercase tracking-widest text-black/40 hover:text-black">Abort</button>
                <button onClick={handleAdd} className="flex-1 py-4 bg-black text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Register</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button 
                onClick={() => canAddMore ? setShowAdd(true) : alert("Free plan is limited to 1 account. Upgrade to Pro for multi-broker management.")}
                disabled={!canAddMore && plan === 'free'}
                className={`w-full py-5 border-2 border-dashed rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${canAddMore ? 'border-black/10 text-black/20 hover:text-black hover:border-black/30 active:scale-[0.98]' : 'border-black/5 text-black/10 cursor-not-allowed opacity-50'}`}
              >
                {canAddMore ? '+ Register New Broker Scope' : 'Broker Limit Reached (Free)'}
              </button>
              {!canAddMore && plan === 'free' && (
                <p className="text-[8px] font-bold text-center text-black/30 uppercase tracking-widest">Upgrade to Pro for unlimited accounts</p>
              )}
            </div>
          )}
        </div>

        <div className="p-8 bg-black/5 border-t border-black/5">
          <button onClick={onClose} className="w-full py-4 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all">Confirm Portfolio</button>
        </div>
      </div>
    </div>
  );
};

export default AccountManager;