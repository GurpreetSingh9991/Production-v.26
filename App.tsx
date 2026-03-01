import React, { useState, useEffect, useMemo } from 'react';
import { Trade, ViewType, PerformanceUnit, Account } from './types';
import { ICONS, TRADER_QUOTES, COLORS } from './constants';
import { loadTrades, saveTrades, exportToCSV } from './services/storage';
import { getSupabaseTrades, syncSingleTradeToSupabase, syncTradesToSupabase, deleteSupabaseTrade, getSupabaseAccounts, syncAccountsToSupabase, getSession, signOut, getSupabaseClient, clearAuthSession } from './services/supabase';
import { canUserAddTrade, getUserPlan, startStripeCheckout } from './services/planService';
import Dashboard from './components/Dashboard';
import TradeLog from './components/TradeLog';
import Calendar from './components/Calendar';
import Analytics from './components/Analytics';
import Psychology from './components/Psychology';
import AIPage from './components/AIPage';
import TradeForm from './components/TradeForm';
import SyncSettings from './components/SyncSettings';
import ProfileSettings from './components/ProfileSettings';
import AccountManager from './components/AccountManager';
import Auth from './components/Auth';
import LoadingBar from './components/LoadingBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import Gamification from './components/Gamification';
import { TermsAcceptanceGate } from './components/Legal';
import { Session } from '@supabase/supabase-js';

// ─── Toast System ─────────────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' | 'warn'; }
let toastIdCounter = 0;

// ─── Haptic Feedback ─────────────────────────────────────────────────────────
const haptic = (pattern: number | number[] = 8) => {
  try { if ('vibrate' in navigator) navigator.vibrate(pattern); } catch {}
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: number) => void }> = ({ toasts, onRemove }) => (
  <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '320px' }}>
    {toasts.map(t => (
      <div key={t.id} onClick={() => onRemove(t.id)}
        className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-2xl text-[12px] font-bold flex items-start gap-3 cursor-pointer animate-in slide-in-from-top-2 duration-300 ${
          t.type === 'success' ? 'bg-emerald-500 text-white' :
          t.type === 'error' ? 'bg-rose-500 text-white' :
          t.type === 'warn' ? 'bg-amber-400 text-black' : 'bg-[#111] text-white'
        }`}>
        <span className="mt-0.5 shrink-0 text-[14px]">{t.type === 'success' ? '✓' : t.type === 'error' ? '✗' : t.type === 'warn' ? '⚠' : 'ℹ'}</span>
        <span className="leading-snug">{t.message}</span>
      </div>
    ))}
  </div>
);

// ─── Upgrade Gates ────────────────────────────────────────────────────────────
const UpgradeGate: React.FC<{ feature: string; onUpgrade: () => void }> = ({ feature, onUpgrade }) => (
  <div className="apple-glass rounded-[2rem] max-w-md mx-auto mt-20 p-10 text-center flex flex-col items-center border border-black/5 shadow-sm">
    <div className="w-16 h-16 bg-black/5 rounded-2xl flex items-center justify-center mb-6">
      <svg className="w-8 h-8 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <h2 className="text-xl font-black tracking-tight text-black mb-2">{feature} — Pro Feature</h2>
    <p className="text-xs font-semibold text-black/60 mb-8">Upgrade to Pro to unlock this feature</p>
    <button onClick={onUpgrade} className="px-8 py-4 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Upgrade to Pro →</button>
  </div>
);

const BlurredUpgradeGate: React.FC<{ feature: string; onUpgrade: () => void; children: React.ReactNode }> = ({ feature, onUpgrade }) => (
  <div className="apple-glass rounded-[2rem] max-w-lg mx-auto mt-16 p-12 text-center flex flex-col items-center border border-black/5 shadow-sm animate-in fade-in duration-300">
    <div className="w-full mb-8 space-y-3 opacity-25 pointer-events-none select-none">
      <div className="h-10 bg-black/10 rounded-2xl w-full" />
      <div className="grid grid-cols-3 gap-3"><div className="h-24 bg-black/10 rounded-2xl" /><div className="h-24 bg-black/10 rounded-2xl" /><div className="h-24 bg-black/10 rounded-2xl" /></div>
      <div className="h-8 bg-black/10 rounded-2xl w-3/4 mx-auto" />
    </div>
    <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-5 shadow-xl">
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <h2 className="text-2xl font-black tracking-tight text-black mb-2">{feature}</h2>
    <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-3">Pro Feature</p>
    <p className="text-sm text-black/40 leading-relaxed mb-8 max-w-xs">Unlock your complete performance analytics. See exactly where your edge is — and where you're leaking money.</p>
    <button onClick={onUpgrade} className="px-10 py-4 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all hover:scale-105">Unlock Pro →</button>
  </div>
);

// ─── Onboarding ───────────────────────────────────────────────────────────────
const OnboardingScreen: React.FC<{ userName: string; userEmail: string; session: any; onComplete: (accounts: any[]) => void }> = ({ userName, onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'account'>('welcome');
  const [accountName, setAccountName] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#111111');
  const [isSaving, setIsSaving] = useState(false);
  const PRESET_COLORS = ['#111111','#2563EB','#16A34A','#DC2626','#7C3AED','#D97706','#0891B2','#BE185D'];
  const handleCreate = async () => {
    if (!accountName.trim()) return;
    setIsSaving(true);
    const acc = { id: crypto.randomUUID(), name: accountName.trim(), initialBalance: Number(balance) || 0, currency: 'USD', color, createdAt: new Date().toISOString() };
    await new Promise(r => setTimeout(r, 600));
    onComplete([acc]);
  };
  return (
    <div className="min-h-[100dvh] bg-[#D6D6D6] flex items-center justify-center p-4 overflow-hidden relative">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-black/[0.03] rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-black/[0.04] rounded-full blur-[100px] pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        {step === 'welcome' ? (
          <div className="apple-glass rounded-[3rem] p-10 shadow-2xl border border-white/60 animate-in zoom-in-95 fade-in duration-700">
            <div className="flex justify-center mb-8"><div className="w-20 h-20 bg-[#111] rounded-[1.8rem] flex items-center justify-center shadow-2xl"><ICONS.Logo className="w-10 h-10 text-white" /></div></div>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-black tracking-tighter text-black leading-none mb-3">Welcome,<br />{userName.split(' ')[0]} 👋</h1>
              <p className="text-[11px] font-bold text-black/40 uppercase tracking-[0.25em]">Your trading journal is ready</p>
            </div>
            <div className="space-y-3 mb-10">
              {[
                { icon: '📊', text: 'Track every trade with P&L, R/R & psychology' },
                { icon: '🤖', text: 'Weekly AI insights powered by Gemini' },
                { icon: '📅', text: 'Calendar, analytics & performance charts' },
                { icon: '🌍', text: 'Forex pips, futures ticks & equity shares' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/60 rounded-2xl px-5 py-3.5"><span className="text-lg">{f.icon}</span><span className="text-[11px] font-bold text-black/70">{f.text}</span></div>
              ))}
            </div>
            <button onClick={() => setStep('account')} className="w-full py-5 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-[0.98] transition-all">Set Up My Account →</button>
          </div>
        ) : (
          <div className="apple-glass rounded-[3rem] p-10 shadow-2xl border border-white/60 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <button onClick={() => setStep('welcome')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/30 hover:text-black transition-colors mb-8">← Back</button>
            <div className="mb-8"><h2 className="text-2xl font-black tracking-tighter text-black mb-1">Create Your Account</h2><p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Broker / portfolio scope</p></div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-black/40 uppercase tracking-widest ml-1">Account Name</label>
                <input type="text" placeholder="e.g. Prop Firm, Personal, FTMO" value={accountName} onChange={e => setAccountName(e.target.value)} className="w-full bg-white border border-black/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-black transition-colors text-black placeholder:text-black/25" autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-black/40 uppercase tracking-widest ml-1">Starting Capital (optional)</label>
                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-black/30">$</span><input type="number" placeholder="0.00" value={balance} onChange={e => setBalance(e.target.value)} className="w-full bg-white border border-black/10 rounded-2xl p-4 pl-8 text-sm font-bold outline-none focus:border-black transition-colors text-black" /></div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-black/40 uppercase tracking-widest ml-1">Color</label>
                <div className="flex gap-2 flex-wrap">{PRESET_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={`w-9 h-9 rounded-xl transition-all active:scale-90 ${color === c ? 'ring-2 ring-black ring-offset-2 scale-105' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />)}</div>
              </div>
            </div>
            {accountName && (
              <div className="mt-6 p-4 bg-white/60 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: color }}><ICONS.Zap className="w-5 h-5 text-white" /></div>
                <div><p className="text-sm font-black text-black">{accountName}</p><p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">{balance ? `$${Number(balance).toLocaleString()} Capital` : 'No starting capital set'}</p></div>
              </div>
            )}
            <button onClick={handleCreate} disabled={!accountName.trim() || isSaving} className="mt-8 w-full py-5 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3">
              {isSaving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Setting Up...</>) : 'Launch My Journal →'}
            </button>
            <p className="text-center text-[9px] text-black/25 font-bold uppercase tracking-widest mt-4">You can add more accounts later in settings</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Desktop Sidebar Nav Button ───────────────────────────────────────────────
const SidebarNavBtn: React.FC<{ onClick: () => void; active: boolean; icon: React.ReactNode; label: string }> = ({ onClick, active, icon, label }) => (
  <div className="relative group/nav w-full flex justify-center">
    <button onClick={onClick} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 relative ${active ? 'bg-white text-[#111111] shadow-xl scale-105' : 'text-white/40 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95'}`}>
      {icon}
      {active && <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-full" />}
    </button>
    <div className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 opacity-0 group-hover/nav:opacity-100 transition-all duration-200 translate-x-[-4px] group-hover/nav:translate-x-0 z-50">
      <div className="bg-[#111] text-white text-[9px] font-black uppercase tracking-[0.15em] px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">{label}<div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111]" /></div>
    </div>
  </div>
);

// ─── Page title helper ────────────────────────────────────────────────────────
const getMobilePageTitle = (view: ViewType): string => {
  const map: Record<ViewType, string> = {
    DASHBOARD: 'Overview',
    TRADES_LOG: 'Journal',
    CALENDAR: 'Calendar',
    ANALYTICS: 'Analytics',
    PSYCHOLOGY: 'Psychology',
    AI_INTELLIGENCE: 'AI Intel',
    SETTINGS: 'Settings',
    GAMIFICATION: 'Achievements',
  };
  return map[view] ?? 'TradeFlow';
};

// ─── Refined hamburger (Apple-style tapered, short middle bar) ───────────────
const HamburgerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0"  width="20" height="2.2" rx="1.1" fill="currentColor" />
    <rect x="4" y="6.9" width="12" height="2.2" rx="1.1" fill="currentColor" />
    <rect x="0" y="13.8" width="20" height="2.2" rx="1.1" fill="currentColor" />
  </svg>
);

// ─── Pro badge ────────────────────────────────────────────────────────────────
const ProBadge: React.FC<{ amber?: boolean }> = ({ amber }) => (
  <span
    className="text-[8px] font-black px-1.5 py-[3px] rounded-md uppercase tracking-wider leading-none shrink-0"
    style={amber
      ? { background: 'rgba(251,191,36,0.14)', color: 'rgba(251,191,36,0.9)' }
      : { background: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.38)' }
    }
  >
    PRO
  </span>
);

// ─── Drawer nav row ───────────────────────────────────────────────────────────
const DrawerNavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  locked?: boolean;
  amber?: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, locked, amber, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-[10px] rounded-xl text-left text-[13px] tracking-tight font-sans transition-all active:scale-[0.97] select-none"
    style={isActive
      ? { background: 'rgba(255,255,255,0.10)', color: 'white', fontWeight: 700 }
      : { color: locked ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.55)', fontWeight: 500 }
    }
  >
    <span className="shrink-0" style={{ color: isActive ? 'white' : locked ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.30)' }}>
      {icon}
    </span>
    <span className="flex-1 truncate">{label}</span>
    {locked && <ProBadge amber={amber} />}
    {isActive && !locked && (
      <div className="w-[3px] h-4 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.4)' }} />
    )}
  </button>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('DASHBOARD');
  const [displayUnit, setDisplayUnit] = useState<PerformanceUnit>('CURRENCY');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('ALL');
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isMobileProfileSheetOpen, setIsMobileProfileSheetOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);
  const [upgradePrompt, setUpgradePrompt] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const openDrawer = () => { haptic(6); setIsMobileDrawerOpen(true); };
  const closeDrawer = () => { haptic(4); setIsMobileDrawerOpen(false); };

  // Swipe edge handler — fire after touch ends
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    // Only capture swipes starting within 28px of left edge
    if (t.clientX <= 28) {
      setSwipeStartX(t.clientX);
      setSwipeStartY(t.clientY);
    } else {
      setSwipeStartX(null);
      setSwipeStartY(null);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX === null || swipeStartY === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeStartX;
    const dy = Math.abs(t.clientY - swipeStartY);
    // Horizontal swipe > 55px, vertical drift < 60px, only when drawer is closed
    if (dx > 55 && dy < 60 && !isMobileDrawerOpen) {
      openDrawer();
    }
    setSwipeStartX(null);
    setSwipeStartY(null);
  };

  const randomQuote = useMemo(() => TRADER_QUOTES[Math.floor(Math.random() * TRADER_QUOTES.length)], []);
  const filteredTrades = useMemo(() => activeAccountId === 'ALL' ? trades : trades.filter(t => t.accountId === activeAccountId), [trades, activeAccountId]);
  const activeAccount = useMemo(() => accounts.find(a => a.id === activeAccountId), [accounts, activeAccountId]);
  const startingEquity = useMemo(() => activeAccount ? activeAccount.initialBalance : accounts.reduce((sum, a) => sum + a.initialBalance, 0), [activeAccount, accounts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      setTimeout(async () => { if (session?.user?.id) { const plan = await getUserPlan(session.user.id); setUserPlan(plan); } toast('🎉 Welcome to Pro! All features unlocked.', 'success', 6000); }, 1500);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('upgrade') === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('portal') === 'returned') {
      setTimeout(async () => { if (session?.user?.id) { const plan = await getUserPlan(session.user.id); setUserPlan(plan); if (plan === 'free') toast("You're now on the Free plan.", 'info', 5000); } }, 1500);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [session]);

  const toast = (message: string, type: Toast['type'] = 'info', duration = 3500) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };
  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const controlStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTrades = filteredTrades.filter(t => t.date === todayStr);
    const todayPnL = todayTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const totalPnL = filteredTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const currentBalance = startingEquity + totalPnL;
    const todayPct = startingEquity > 0 ? (todayPnL / startingEquity) * 100 : 0;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekTrades = filteredTrades.filter(t => new Date(t.date) >= weekAgo);
    const wins = filteredTrades.filter(t => t.pnl > 0).length;
    const winRate = filteredTrades.length > 0 ? (wins / filteredTrades.length) * 100 : 0;
    const alerts: any[] = [];
    let streak = 0;
    for (const t of [...filteredTrades].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())) { if (t.pnl < 0) streak++; else if (t.pnl > 0) break; }
    if (streak >= 2) alerts.push({ type: 'warning', text: `${streak}-trade loss streak`, icon: <ICONS.Target className="w-3 h-3 text-rose-500" /> });
    if (todayPnL > 0 && todayTrades.length > 0) alerts.push({ type: 'insight', text: `Edge identified: Session +$${Math.round(todayPnL)}`, icon: <ICONS.Win className="w-3 h-3 text-emerald-500" /> });
    else if (todayPnL < -200) alerts.push({ type: 'warning', text: `Daily threshold warning`, icon: <ICONS.Info className="w-3 h-3 text-amber-500" /> });
    return { currentBalance, todayPnL, todayPct, todayCount: todayTrades.length, weekCount: weekTrades.length, winRate, alerts };
  }, [filteredTrades, startingEquity]);

  const handleAuthCleanup = async () => {
    const client = getSupabaseClient(); clearAuthSession();
    if (client) await client.auth.signOut();
    setSession(null); setTrades([]); setAccounts([]); setUserPlan('free'); setActiveAccountId('ALL');
    ['precision_trader_journal_data','tf_accounts','tf_cached_user_id','tf_terms_accepted','tf_sheet_url'].forEach(k => localStorage.removeItem(k));
    setIsAuthLoading(false);
  };

  const initializeApp = async () => {
    setIsAuthLoading(true);
    const client = getSupabaseClient();
    if (!client) { const sa = localStorage.getItem('tf_accounts'); if (sa) setAccounts(JSON.parse(sa)); setTrades(loadTrades()); setIsAuthLoading(false); return; }
    try {
      const { data: { session: s }, error: sessionError } = await client.auth.getSession();
      if (sessionError) { const el = sessionError.message.toLowerCase(); if (['refresh_token','not found','invalid_grant','expired'].some(x => el.includes(x))) { await handleAuthCleanup(); return; } }
      setSession(s);
      if (s) {
        const cachedId = localStorage.getItem('tf_cached_user_id');
        if (cachedId === s.user.id) { const ca = localStorage.getItem('tf_accounts'); const ct = loadTrades(); if (ca) { try { setAccounts(JSON.parse(ca)); } catch (_) {} } if (ct.length > 0) setTrades(ct); }
        else { localStorage.removeItem('precision_trader_journal_data'); localStorage.removeItem('tf_accounts'); localStorage.setItem('tf_cached_user_id', s.user.id); }
        const termsTs = localStorage.getItem('tf_terms_accepted');
        if (!termsTs) {
          const accountCreated = s.user?.created_at ? new Date(s.user.created_at) : new Date();
          if (accountCreated < new Date('2025-02-01T00:00:00Z')) { localStorage.setItem('tf_terms_accepted', 'legacy-auto-accepted'); }
          else { const sb = getSupabaseClient(); if (sb) { const { data: p } = await sb.from('profiles').select('terms_accepted_at').eq('id', s.user.id).single(); if (p?.terms_accepted_at) localStorage.setItem('tf_terms_accepted', p.terms_accepted_at); else setNeedsTermsAcceptance(true); } }
        }
      }
      client.auth.onAuthStateChange(async (event, newSession) => {
        if (event === 'SIGNED_OUT') { setSession(null); setTrades([]); setAccounts([]); setUserPlan('free'); }
        else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(newSession);
          if (newSession) {
            await new Promise(r => setTimeout(r, 150));
            try {
              const [ra, rt, plan] = await Promise.race([
                Promise.all([getSupabaseAccounts(), getSupabaseTrades(), getUserPlan(newSession.user.id)]),
                new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))
              ]);
              setUserPlan(plan);
              if (ra) { setAccounts(ra); localStorage.setItem('tf_accounts', JSON.stringify(ra)); }
              if (rt) { setTrades(rt); saveTrades(rt); }
              localStorage.setItem('tf_cached_user_id', newSession.user.id);
            } catch {
              const ca = localStorage.getItem('tf_accounts');
              if (ca) { try { setAccounts(JSON.parse(ca)); } catch (_) {} }
              setTrades(loadTrades());
            }
          }
        } else if (newSession) { setSession(newSession); const plan = await getUserPlan(newSession.user.id); setUserPlan(plan); }
      });
      if (s) {
        try {
          const [ra, rt, plan] = await Promise.all([getSupabaseAccounts(), getSupabaseTrades(), getUserPlan(s.user.id)]);
          setUserPlan(plan);
          if (ra) { setAccounts(ra); localStorage.setItem('tf_accounts', JSON.stringify(ra)); if (ra.length === 0) setShowOnboarding(true); }
          else { const sa = localStorage.getItem('tf_accounts'); if (sa) setAccounts(JSON.parse(sa)); else setShowOnboarding(true); }
          if (rt) { setTrades(rt); saveTrades(rt); } else setTrades(loadTrades());
          localStorage.setItem('tf_cached_user_id', s.user.id);
        } catch (e: any) { if (e.message === 'AUTH_ERROR') { await handleAuthCleanup(); return; } throw e; }
      } else { const sa = localStorage.getItem('tf_accounts'); if (sa) setAccounts(JSON.parse(sa)); setTrades(loadTrades()); }
    } catch { await handleAuthCleanup(); } finally { setIsAuthLoading(false); }
  };

  useEffect(() => { initializeApp(); }, []);
  useEffect(() => { setIsAccountManagerOpen(false); setIsMobileMoreOpen(false); }, [activeView]);

  const handleLogout = async () => {
    try { const c = getSupabaseClient(); if (c) await Promise.race([c.auth.signOut(), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 3000))]).catch(() => {}); } catch (_) {}
    clearAuthSession();
    try { const keys: string[] = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && (k.startsWith('tf_') || k.startsWith('sb-'))) keys.push(k); } keys.forEach(k => localStorage.removeItem(k)); } catch (_) {}
    setSession(null); setUserPlan('free'); setTrades([]); setAccounts([]); setActiveAccountId('ALL'); setActiveView('DASHBOARD');
  };

  const handleDeleteTrade = async (id: string) => {
    const updated = trades.filter(t => t.id !== id);
    setTrades(updated);
    requestAnimationFrame(() => saveTrades(updated));
    deleteSupabaseTrade(id).catch(console.error);
  };

  const handleSaveAccount = async (newAccounts: Account[]) => {
    if (activeAccountId !== 'ALL' && !newAccounts.some(a => a.id === activeAccountId)) setActiveAccountId('ALL');
    if (showOnboarding && newAccounts.length > 0) { setShowOnboarding(false); toast('✓ Account set up! Welcome to TradeFlow.', 'success', 4000); }
    setAccounts(newAccounts);
    localStorage.setItem('tf_accounts', JSON.stringify(newAccounts));
    if (session) await syncAccountsToSupabase(newAccounts);
  };

  const handleExternalSync = async () => {
    const sheetUrl = localStorage.getItem('tf_sheet_url');
    if (!sheetUrl) { toast('No Google Sheet linked. Add a sheet URL in Settings first.', 'warn'); return; }
    setIsSyncing(true);
    try {
      const { fetchTradesFromSheets } = await import('./services/sync');
      const synced = await fetchTradesFromSheets({ sheetUrl, lastSynced: null, autoSync: false });
      if (synced && synced.length > 0) {
        const withAcc = synced.map(t => ({ ...t, accountId: t.accountId || (accounts[0]?.id || '') }));
        const merged = [...withAcc, ...trades.filter(ex => !withAcc.some(imp => imp.date === ex.date && imp.symbol === ex.symbol))];
        setTrades(merged); saveTrades(merged); await syncTradesToSupabase(merged);
        toast(`✓ Synced ${synced.length} trades from Google Sheets`, 'success');
      } else if (synced !== null) { toast('Sheet synced but no trades found. Check your sheet format.', 'warn'); }
      else { toast('Sync failed. Make sure your sheet is shared to "Anyone with the link".', 'error'); }
    } catch (e: any) { if (e.message === 'AUTH_ERROR') { await handleAuthCleanup(); return; } toast(`Sync error: ${e.message}`, 'error'); }
    finally { setIsSyncing(false); }
  };

  const handleCloudRefresh = async () => {
    if (!session) return;
    setIsCloudSyncing(true);
    try {
      const [ra, rt] = await Promise.all([getSupabaseAccounts(), getSupabaseTrades()]);
      if (ra) { setAccounts(ra); localStorage.setItem('tf_accounts', JSON.stringify(ra)); }
      if (rt) { setTrades(rt); saveTrades(rt); }
      toast('Cloud data refreshed', 'success');
    } catch (e: any) { if (e.message === 'AUTH_ERROR') { await handleAuthCleanup(); return; } toast('Cloud refresh failed.', 'error'); }
    finally { setIsCloudSyncing(false); }
  };

  const handleImportCSV = async (csvText: string) => {
    setIsImporting(true);
    try {
      const { parseCSV } = await import('./services/storage');
      const imported = parseCSV(csvText, activeAccountId !== 'ALL' ? activeAccountId : (accounts[0]?.id || ''));
      if (imported.length === 0) { toast('No trades found in CSV. Check the file format.', 'warn'); setIsImporting(false); return; }
      const merged = [...imported, ...trades];
      setTrades(merged); saveTrades(merged); await syncTradesToSupabase(merged);
      toast(`✓ Imported ${imported.length} trades`, 'success');
    } catch (e: any) { if (e.message === 'AUTH_ERROR') { await handleAuthCleanup(); return; } toast(`Import failed: ${e.message}`, 'error'); }
    finally { setIsImporting(false); }
  };

  if (isAuthLoading) return <LoadingBar message="Initializing Journal..." />;
  if (!session) return <Auth onAuthSuccess={initializeApp} />;

  const userName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Trader';
  const userEmail = session?.user?.email || '';

  if (needsTermsAcceptance) {
    return (
      <TermsAcceptanceGate userName={userName} onAccept={async () => {
        const ts = new Date().toISOString();
        localStorage.setItem('tf_terms_accepted', ts);
        const sb = getSupabaseClient();
        if (sb && session?.user?.id) await sb.from('profiles').update({ terms_accepted_at: ts }).eq('id', session.user.id);
        setNeedsTermsAcceptance(false);
      }} />
    );
  }

  if (showOnboarding) return <OnboardingScreen userName={userName} userEmail={userEmail} session={session} onComplete={handleSaveAccount} />;

  const openTradeForm = (trade?: Trade | null, date?: string) => {
    setEditingTrade(trade || null);
    setPrefillDate(date);
    setIsFormOpen(true);
  };

  return (
    <ErrorBoundary>
    <div
      className="flex min-h-[100dvh] h-[100dvh] bg-[#D6D6D6] text-black overflow-hidden font-sans selection:bg-black/10"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* ══ DESKTOP: Sidebar Rail ══════════════════════════════════════════════ */}
      <aside className="hidden lg:flex tf-sidebar-rail">
        <div className="flex flex-col items-center gap-1 w-full">
          <button className="w-9 h-9 bg-[#111111] rounded-full flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all shadow-lg mb-4">
            <ICONS.Logo className="w-5 h-5" />
          </button>
          <nav className="flex flex-col gap-1 w-full items-center">
            <SidebarNavBtn onClick={() => setActiveView('DASHBOARD')} active={activeView === 'DASHBOARD'} icon={<ICONS.Dashboard className="w-5 h-5" />} label="Dashboard" />
            <SidebarNavBtn onClick={() => setActiveView('TRADES_LOG')} active={activeView === 'TRADES_LOG'} icon={<ICONS.Journal className="w-5 h-5" />} label="Trade Log" />
            <SidebarNavBtn onClick={() => setActiveView('CALENDAR')} active={activeView === 'CALENDAR'} icon={<ICONS.Calendar className="w-5 h-5" />} label="Calendar" />
            <SidebarNavBtn onClick={() => setActiveView('ANALYTICS')} active={activeView === 'ANALYTICS'} icon={<ICONS.Performance className="w-5 h-5" />} label="Analytics" />
            <SidebarNavBtn onClick={() => setActiveView('PSYCHOLOGY')} active={activeView === 'PSYCHOLOGY'} icon={<ICONS.Psychology className="w-5 h-5" />} label="Psychology" />
            <SidebarNavBtn onClick={() => setActiveView('AI_INTELLIGENCE')} active={activeView === 'AI_INTELLIGENCE'} icon={<ICONS.AIIntelligence className="w-5 h-5" />} label="AI Intel" />
            <SidebarNavBtn onClick={() => setActiveView('GAMIFICATION' as any)} active={(activeView as string) === 'GAMIFICATION'} icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>} label="Progress" />
          </nav>
        </div>
        <div className="flex flex-col items-center gap-1 w-full mt-auto">
          <SidebarNavBtn onClick={() => setIsAccountManagerOpen(true)} active={false} icon={<ICONS.Dollar className="w-5 h-5" />} label="Accounts" />
          <SidebarNavBtn onClick={() => setActiveView('SETTINGS')} active={activeView === 'SETTINGS'} icon={<ICONS.Settings className="w-5 h-5" />} label="Settings" />
          <div className="relative group/nav w-full flex justify-center">
            <button onClick={handleLogout} className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 text-rose-400/50 hover:text-rose-400 hover:bg-rose-400/10 hover:scale-105 active:scale-95"><ICONS.LogOut className="w-5 h-5" /></button>
            <div className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 opacity-0 group-hover/nav:opacity-100 transition-all duration-200 z-50">
              <div className="bg-rose-600 text-white text-[9px] font-black uppercase tracking-[0.15em] px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">Sign Out<div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-rose-600" /></div>
            </div>
          </div>
        </div>
      </aside>

      {/* ══ DESKTOP: Stats Sidebar ═════════════════════════════════════════════ */}
      <aside
        className="hidden lg:flex tf-sidebar lg:left-16 top-4 bottom-4 flex-col lg:w-[280px] overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.52) 100%)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.75)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        <div
          className="p-6 flex items-center gap-3 cursor-pointer transition-all group flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
          onClick={() => setIsProfileOpen(true)}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shadow-sm" style={{ border: '1.5px solid rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.04)' }}>
            <img src={session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${userName}`} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden flex-1">
            <h2 className="text-sm font-bold text-black tracking-tight flex items-center gap-2 truncate">
              {userName}
              {userPlan === 'pro' && <span className="px-2 py-0.5 bg-gradient-to-tr from-black to-slate-800 text-white text-[7px] font-black uppercase tracking-[0.15em] rounded-full shrink-0 shadow-sm border border-white/20">PRO</span>}
            </h2>
            <p className="text-[10px] text-black/30 font-semibold truncate">{userEmail}</p>
          </div>
          <svg className="w-3.5 h-3.5 text-black/15 group-hover:text-black/40 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </div>
        <div className="px-4 flex-1 overflow-y-auto custom-scrollbar space-y-5 pb-6 pt-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[9px] font-black text-black/30 uppercase tracking-[0.25em]">Active Scope</h3>
              <button onClick={() => setIsAccountManagerOpen(true)} className="text-[8px] font-black uppercase tracking-widest text-black/30 hover:text-black transition-colors">Switch</button>
            </div>
            <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: activeAccount?.color || '#000' }} /><span className="text-[11px] font-black text-black truncate max-w-[120px]">{activeAccount?.name || 'Overall Portfolio'}</span></div>
                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black ${controlStats.todayPnL >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>{controlStats.todayPnL >= 0 ? '↑' : '↓'} {Math.abs(controlStats.todayPct).toFixed(2)}%</div>
              </div>
              <div>
                <p className="text-[22px] font-black tracking-tighter leading-none">${controlStats.currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-[9px] font-bold text-black/20 uppercase tracking-widest mt-1">Today: <span className={controlStats.todayPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{controlStats.todayPnL >= 0 ? '+' : '-'}${Math.abs(Math.round(controlStats.todayPnL)).toLocaleString()}</span></p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-[9px] font-black text-black/30 uppercase tracking-[0.25em] px-1">Velocity</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.85)' }}><p className="text-[7px] font-black text-black/30 uppercase tracking-widest mb-1">Today</p><p className="text-sm font-black">{controlStats.todayCount} Trades</p></div>
              <div className="p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.85)' }}><p className="text-[7px] font-black text-black/30 uppercase tracking-widest mb-1">Weekly</p><p className="text-sm font-black">{controlStats.weekCount} Vol.</p></div>
              <div className="p-3 rounded-2xl col-span-2 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.85)' }}><div><p className="text-[7px] font-black text-black/30 uppercase tracking-widest mb-0.5">Win Rate</p><p className="text-sm font-black">{controlStats.winRate.toFixed(1)}%</p></div><ICONS.Insights className="w-5 h-5 text-black/10" /></div>
            </div>
          </div>
          {controlStats.alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[9px] font-black text-black/30 uppercase tracking-[0.25em] px-1">Alerts</h3>
              <div className="space-y-1.5">{controlStats.alerts.map((a, i) => (<div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${a.type === 'warning' ? 'bg-rose-500/[0.04] border-rose-500/15' : 'bg-emerald-500/[0.04] border-emerald-500/15'}`}><div className="shrink-0">{a.icon}</div><p className="text-[9px] font-black text-black/70 italic leading-none">{a.text}</p></div>))}</div>
            </div>
          )}
        </div>
        <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="p-4 rounded-2xl relative overflow-hidden group" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.85)' }}>
            <ICONS.Quote className="absolute -right-2 -bottom-2 w-14 h-14 text-black/[0.04] -rotate-12 transition-transform duration-700 group-hover:scale-110" />
            <p className="text-[10px] text-black/50 font-black italic leading-relaxed relative z-10">"{randomQuote.text}"</p>
          </div>
        </div>
      </aside>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col apple-glass lg:ambient-shadow overflow-hidden relative border-none z-[1] lg:ml-[calc(4rem+280px+16px)] lg:mr-4 lg:mt-4 lg:mb-4 lg:h-[calc(100dvh-32px)]" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

        {/* ── Page Header ─────────────────────────────────────────────────────── */}
        {activeView !== 'SETTINGS' && (
          <header
            className="flex-shrink-0 z-[100] lg:relative lg:border-none fixed top-0 left-0 right-0 px-4 sm:px-8 flex flex-col border-none"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              // ✅ FIX: transparent frosted glass matching app grey — no white/grey box
              background: 'rgba(218, 218, 218, 0.78)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
          >
            <div className="flex items-center justify-between h-[56px] lg:h-auto lg:mt-6 lg:bg-transparent" style={{ background: 'transparent' }}>

              {/* ── Mobile left: minimal hamburger + page context ── */}
              <div className="flex lg:hidden items-center gap-2.5 min-w-0">
                {/* Clean hamburger — no boxy background, just a tap target */}
                <button
                  onClick={openDrawer}
                  className="flex items-center justify-center transition-all active:scale-90 shrink-0"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  <HamburgerIcon className="w-[18px] h-[14px] text-black/75" />
                </button>

                {/* Page title with optional account color dot */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {activeAccount && activeView === 'DASHBOARD' && (
                    <div className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: activeAccount.color }} />
                  )}
                  <span className="text-[14px] font-black tracking-tight text-black truncate leading-none">
                    {getMobilePageTitle(activeView)}
                  </span>
                </div>
              </div>

              {/* Desktop title */}
              <h1 className="hidden lg:block text-2xl font-bold tracking-tight text-black">
                {activeView === 'DASHBOARD' ? 'Performance' : activeView === 'TRADES_LOG' ? 'Library' : activeView === 'CALENDAR' ? 'Monthly Scope' : activeView === 'PSYCHOLOGY' ? 'Psychology' : activeView === 'AI_INTELLIGENCE' ? 'Intelligence' : 'Analytics'}
              </h1>

              {/* New entry */}
              <div className="flex items-center gap-2">
                <button onClick={() => openTradeForm()} className="hidden sm:flex px-5 py-2.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg items-center gap-2 transition-transform active:scale-95">
                  <ICONS.Plus className="w-3 h-3" /> New Entry
                </button>
                <button onClick={() => openTradeForm()} className="flex sm:hidden w-9 h-9 items-center justify-center bg-black text-white rounded-full shadow-lg active:scale-90 transition-transform">
                  <ICONS.Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Desktop account pills */}
            <div className="hidden lg:flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button onClick={() => setActiveAccountId('ALL')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all border ${activeAccountId === 'ALL' ? 'bg-black text-white border-black' : 'bg-black/5 text-black/40 border-transparent'}`}>Overall</button>
                {accounts.map(acc => (
                  <button key={acc.id} onClick={() => setActiveAccountId(acc.id)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-2 border ${activeAccountId === acc.id ? 'bg-black text-white border-black' : 'bg-black/5 text-black/40 border-transparent'}`}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: acc.color }} />{acc.name}
                  </button>
                ))}
              </div>
            </div>
          </header>
        )}

        {/* ── Main Content ─────────────────────────────────────────────────────── */}
        <main
          className={`flex-1 overflow-y-auto touch-scroll will-change-transform ${
            activeView === 'SETTINGS' ? 'p-0' : 'p-4 sm:p-6 md:p-10'
          } ${
            activeView !== 'SETTINGS' ? 'pt-[calc(56px+env(safe-area-inset-top)+16px)] lg:pt-6' : 'pt-0'
          } min-h-0`}
          style={{
            // ✅ FIX: transparent background — bottom safe area matches the app grey, no weird box
            background: activeView === 'SETTINGS' ? '#EFEFEF' : 'transparent',
            paddingBottom: activeView === 'SETTINGS' ? 0 : 'max(32px, calc(env(safe-area-inset-bottom) + 24px))',
          }}
        >
          <div className={`${activeView === 'SETTINGS' ? 'h-full' : 'max-w-6xl mx-auto space-y-6 sm:space-y-8'}`}>
            <div key={activeView} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {activeView === 'DASHBOARD' && (
                <>
                  <Dashboard displayUnit={displayUnit} setDisplayUnit={setDisplayUnit} trades={filteredTrades} activeAccount={activeAccount} accounts={accounts} onTradeEdit={(t) => openTradeForm(t)} onTradeDelete={handleDeleteTrade} />
                  {userPlan === 'pro' && <div className="mt-8 pt-8 border-t border-black/5 text-center flex flex-col items-center gap-2 opacity-40"><ICONS.Zap className="w-4 h-4 text-emerald-600" /><p className="text-[9px] font-black uppercase tracking-[0.3em]">Pro Access Active • Infinite Ops</p></div>}
                </>
              )}
              {activeView === 'TRADES_LOG' && <TradeLog displayUnit={displayUnit} trades={filteredTrades} onEdit={(t) => openTradeForm(t)} onDelete={handleDeleteTrade} startingEquity={startingEquity} />}
              {activeView === 'CALENDAR' && (
                <Calendar
                  trades={filteredTrades} displayUnit={displayUnit} startingEquity={startingEquity}
                  onTradeEdit={(t) => openTradeForm(t)} onTradeDelete={handleDeleteTrade}
                  onAddTradeForDate={(date: string) => openTradeForm(null, date)}
                />
              )}
              {/* ✅ FIX: Analytics is now correctly Pro-gated for free users */}
              {activeView === 'ANALYTICS' && (
                userPlan === 'pro'
                  ? <Analytics trades={filteredTrades} />
                  : <BlurredUpgradeGate feature="Analytics" onUpgrade={() => setUpgradePrompt('analytics')}><Analytics trades={filteredTrades} /></BlurredUpgradeGate>
              )}
              {activeView === 'PSYCHOLOGY' && (
                userPlan === 'pro'
                  ? <Psychology trades={filteredTrades} />
                  : <BlurredUpgradeGate feature="Psychology Tracker" onUpgrade={() => setUpgradePrompt('psychology')}><Psychology trades={filteredTrades} /></BlurredUpgradeGate>
              )}
              {activeView === 'AI_INTELLIGENCE' && (
                userPlan === 'pro'
                  ? <AIPage trades={filteredTrades} />
                  : <UpgradeGate feature="AI Intelligence" onUpgrade={() => setUpgradePrompt('ai')} />
              )}
              {(activeView as string) === 'GAMIFICATION' && (
                <Gamification trades={filteredTrades} userName={userName} />
              )}
              {activeView === 'SETTINGS' && (
                <div className="px-6 sm:px-10 lg:px-0 pb-4">
                  <SyncSettings
                    config={{ sheetUrl: localStorage.getItem('tf_sheet_url') || '', lastSynced: null, autoSync: false }}
                    onSave={(cfg) => { if (cfg.sheetUrl) localStorage.setItem('tf_sheet_url', cfg.sheetUrl); }}
                    onClose={() => setActiveView('DASHBOARD')}
                    onExportCSV={() => exportToCSV(trades)}
                    onExternalSync={handleExternalSync}
                    onCloudRefresh={handleCloudRefresh}
                    onImportCSV={handleImportCSV}
                    isSyncing={isSyncing} isCloudSyncing={isCloudSyncing} hasSession={!!session}
                    displayUnit={displayUnit} setDisplayUnit={setDisplayUnit} userPlan={userPlan} activeAccountId={activeAccountId}
                  />
                  {/* ✅ FIX: Terms & Privacy now link to web pages, not email */}
                  <div className="flex items-center justify-center gap-6 py-8 mt-2">
                    <a
                      href="https://tradeflowjournal.com/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-black/30 hover:text-black/60 transition-colors uppercase tracking-widest underline-offset-4 hover:underline"
                    >
                      Terms of Service
                    </a>
                    <div className="w-1 h-1 rounded-full bg-black/20" />
                    <a
                      href="https://tradeflowjournal.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-black/30 hover:text-black/60 transition-colors uppercase tracking-widest underline-offset-4 hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ══ MOBILE: Apple Dark Glass Drawer ════════════════════════════════════ */}
        <div className="lg:hidden">
          {/* Blurred backdrop */}
          {isMobileDrawerOpen && (
            <div
              className="fixed inset-0 z-[95] animate-in fade-in duration-200"
              style={{ background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
              onClick={closeDrawer}
            />
          )}

          {/* ── Drawer Panel ─────────────────────────────────────────────────── */}
          <div
            className={`fixed top-0 left-0 bottom-0 z-[96] w-[286px] flex flex-col transform transition-transform duration-300 ease-out ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
            style={{
              // ✅ Deep Apple-style dark glass — rich, layered, not flat black
              background: 'linear-gradient(175deg, rgba(18,18,26,0.88) 0%, rgba(12,12,18,0.94) 100%)',
              backdropFilter: 'blur(80px) saturate(250%)',
              WebkitBackdropFilter: 'blur(80px) saturate(250%)',
              borderRight: '1px solid rgba(255,255,255,0.10)',
              // ✅ FIX: Only apply shadow when open — when closed the 10px 0 60px shadow bleeds onto the screen edge
              boxShadow: isMobileDrawerOpen ? '10px 0 60px rgba(0,0,0,0.65), inset -1px 0 0 rgba(255,255,255,0.035)' : 'none',
            }}
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div
              className="flex-shrink-0 px-4 pb-4"
              style={{
                paddingTop: 'max(22px, env(safe-area-inset-top))',
                borderBottom: '1px solid rgba(255,255,255,0.052)',
              }}
            >
              {/* Logo row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 flex items-center justify-center shrink-0"
                    style={{ background: 'white', borderRadius: 9, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                  >
                    <ICONS.Logo className="w-[18px] h-[18px] text-black" />
                  </div>
                  <span className="text-[15px] font-black tracking-tight" style={{ color: 'rgba(255,255,255,0.92)' }}>TradeFlow</span>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center justify-center transition-all active:scale-90"
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* User card */}
              <button
                className="w-full flex items-center gap-3 px-3 py-3 rounded-[14px] text-left transition-all active:scale-[0.97]"
                style={{
                  background: 'rgba(255,255,255,0.055)',
                  border: '1px solid rgba(255,255,255,0.068)',
                }}
                onClick={() => { haptic(6); setIsMobileProfileSheetOpen(true); closeDrawer(); }}
              >
                <img
                  src={session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${userName}`}
                  className="w-10 h-10 object-cover shrink-0"
                  style={{ borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.10)' }}
                  alt="Avatar"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold truncate leading-snug" style={{ color: 'rgba(255,255,255,0.90)' }}>{userName}</p>
                  <div className="flex items-center gap-2 mt-[3px]">
                    {userPlan === 'pro'
                      ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '2px 8px', borderRadius: 999,
                          background: 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.12) 100%)',
                          border: '1px solid rgba(251,191,36,0.35)',
                          color: '#f59e0b',
                          fontSize: 9, fontWeight: 900, letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                        }}>PRO</span>
                      )
                      : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold leading-none" style={{ color: 'rgba(255,255,255,0.28)' }}>Free</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); haptic(6); startStripeCheckout(session?.user?.id || '', userName, userEmail); closeDrawer(); }}
                            className="text-[9px] px-[7px] py-[3px] rounded-[6px] font-black uppercase tracking-wide transition-all active:scale-95 leading-none"
                            style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            Upgrade
                          </button>
                        </div>
                      )
                    }
                  </div>
                </div>
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'rgba(255,255,255,0.14)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* ── Nav ─────────────────────────────────────────────────────── */}
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" style={{ scrollbarWidth: 'none' }}>

              {/* Workspace section */}
              <p className="text-[9px] font-black uppercase tracking-[0.24em] px-2 pb-1.5 pt-1" style={{ color: 'rgba(255,255,255,0.17)' }}>Workspace</p>

              {/* ✅ Analytics has PRO badge in nav for free users */}
              {([
                { view: 'DASHBOARD'  as ViewType, icon: <ICONS.Dashboard   className="w-[17px] h-[17px]" />, label: 'Dashboard',  proOnly: false },
                { view: 'TRADES_LOG' as ViewType, icon: <ICONS.Journal     className="w-[17px] h-[17px]" />, label: 'Journal',    proOnly: false },
                { view: 'CALENDAR'   as ViewType, icon: <ICONS.Calendar    className="w-[17px] h-[17px]" />, label: 'Calendar',   proOnly: false },
                { view: 'ANALYTICS'  as ViewType, icon: <ICONS.Performance className="w-[17px] h-[17px]" />, label: 'Analytics',  proOnly: true  },
              ] as const).map(({ view, icon, label, proOnly }) => {
                const locked = proOnly && userPlan !== 'pro';
                return (
                  <DrawerNavItem
                    key={view}
                    icon={icon}
                    label={label}
                    isActive={activeView === view && !locked}
                    locked={locked}
                    onClick={() => {
                      if (locked) { haptic([6,6]); setUpgradePrompt('analytics'); closeDrawer(); return; }
                      haptic(6); setActiveView(view); closeDrawer();
                    }}
                  />
                );
              })}

              {/* Pro Features */}
              <div className="pt-2 pb-1"><div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} /></div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] px-2 pb-1.5" style={{ color: 'rgba(255,255,255,0.17)' }}>Pro Features</p>

              {([
                { view: 'PSYCHOLOGY'      as ViewType, icon: <ICONS.Psychology     className="w-[17px] h-[17px]" />, label: 'Psychology', prompt: 'psychology' },
                { view: 'AI_INTELLIGENCE' as ViewType, icon: <ICONS.AIIntelligence className="w-[17px] h-[17px]" />, label: 'AI Intel',   prompt: 'ai' },
              ] as const).map(({ view, icon, label, prompt }) => {
                const locked = userPlan !== 'pro';
                return (
                  <DrawerNavItem
                    key={view}
                    icon={icon}
                    label={label}
                    isActive={!locked && activeView === view}
                    locked={locked}
                    amber
                    onClick={() => {
                      if (locked) { haptic([6,6]); setUpgradePrompt(prompt); closeDrawer(); return; }
                      haptic(6); setActiveView(view); closeDrawer();
                    }}
                  />
                );
              })}

              {/* System */}
              <div className="pt-2 pb-1"><div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} /></div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] px-2 pb-1.5" style={{ color: 'rgba(255,255,255,0.17)' }}>System</p>

              <DrawerNavItem
                icon={<svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
                label="Progress"
                isActive={(activeView as string) === 'GAMIFICATION'}
                onClick={() => { haptic(6); setActiveView('GAMIFICATION' as any); closeDrawer(); }}
              />
              <DrawerNavItem
                icon={<ICONS.Dollar className="w-[17px] h-[17px]" />}
                label="Accounts"
                onClick={() => { haptic(6); setIsAccountManagerOpen(true); closeDrawer(); }}
              />
              <DrawerNavItem
                icon={<ICONS.Settings className="w-[17px] h-[17px]" />}
                label="Settings"
                isActive={activeView === 'SETTINGS'}
                onClick={() => { haptic(6); setActiveView('SETTINGS'); closeDrawer(); }}
              />
            </nav>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div
              className="flex-shrink-0 px-3 pt-2"
              style={{
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                borderTop: '1px solid rgba(255,255,255,0.048)',
              }}
            >
              <button
                onClick={() => { haptic(8); handleLogout(); closeDrawer(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-[13.5px] font-semibold tracking-tight transition-all active:scale-[0.97]"
                style={{ color: 'rgba(252,100,120,0.78)' }}
              >
                <ICONS.LogOut className="w-[17px] h-[17px]" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Mobile Profile Sheet ═══════════════════════════════════════════════ */}
      {isMobileProfileSheetOpen && (
        <div className="fixed inset-0 z-[150] lg:hidden animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileProfileSheetOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
            <div className={`p-8 pt-6 pb-8 ${userPlan === 'pro' ? 'bg-[#111111]' : 'bg-white'}`}>
              <div className={`w-12 h-1.5 rounded-full mx-auto mb-8 ${userPlan === 'pro' ? 'bg-white/10' : 'bg-black/10'}`} />
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center overflow-hidden border shrink-0 shadow-md ${userPlan === 'pro' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                  <img src={session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${userName}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h3 className={`text-xl font-black tracking-tight truncate ${userPlan === 'pro' ? 'text-white' : 'text-black'}`}>{userName}</h3>
                  {userPlan === 'pro' ? <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">PRO MEMBER</span> : <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">FREE MEMBER</span>}
                  <p className={`text-[11px] font-bold truncate mt-1 ${userPlan === 'pro' ? 'text-white/40' : 'text-black/40'}`}>{userEmail}</p>
                </div>
              </div>
            </div>
            <div className="p-8 pt-6 bg-white space-y-3" style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
              <button onClick={() => { setIsMobileProfileSheetOpen(false); setIsAccountManagerOpen(true); }} className="w-full flex items-center justify-between p-5 bg-black/5 rounded-2xl transition-all active:scale-[0.98]">
                <div className="flex items-center gap-3"><ICONS.Dollar className="w-5 h-5 text-black/60" /><span className="text-sm font-bold text-black uppercase tracking-tight">Switch Account</span></div>
                <ICONS.ChevronRight className="w-4 h-4 text-black/20" />
              </button>
              <button onClick={() => { setIsMobileProfileSheetOpen(false); setActiveView('SETTINGS'); }} className="w-full flex items-center justify-between p-5 bg-black/5 rounded-2xl transition-all active:scale-[0.98]">
                <div className="flex items-center gap-3"><ICONS.Settings className="w-5 h-5 text-black/60" /><span className="text-sm font-bold text-black uppercase tracking-tight">Settings</span></div>
                <ICONS.ChevronRight className="w-4 h-4 text-black/20" />
              </button>
              <div className="pt-4">
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-5 bg-rose-500/10 text-rose-600 rounded-2xl transition-all active:scale-[0.98]">
                  <ICONS.LogOut className="w-5 h-5" /><span className="text-sm font-black uppercase tracking-widest">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ══ Upgrade Modal ══════════════════════════════════════════════════════ */}
      {upgradePrompt !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUpgradePrompt(null)} />
          <div className="apple-glass w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"><ICONS.Zap className="w-8 h-8 text-white" /></div>
            <h3 className="text-xl font-black tracking-tight text-black mb-2">
              {upgradePrompt === 'trades' ? 'Trade Limit Reached' : upgradePrompt === 'analytics' ? 'Analytics is Pro' : upgradePrompt === 'psychology' ? 'Psychology is Pro' : upgradePrompt === 'ai' ? 'AI Intel is Pro' : 'Upgrade to Pro'}
            </h3>
            <p className="text-xs font-semibold text-black/60 leading-relaxed mb-8">
              {upgradePrompt === 'trades' ? "You've used all 15 trades this month. Go Pro for unlimited." : upgradePrompt === 'analytics' ? 'Unlock setup performance, session analysis, and R-multiple distribution.' : upgradePrompt === 'psychology' ? 'Track mood, plan adherence, and the cost of trading mistakes.' : 'Gemini AI surfaces hidden patterns and personalized recommendations.'}
            </p>
            <div className="space-y-3">
              <button onClick={() => { if (session?.user?.id) startStripeCheckout(session.user.id); setUpgradePrompt(null); }} className="w-full py-4 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Upgrade to Pro</button>
              <button onClick={() => setUpgradePrompt(null)} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors">Maybe Later</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Trade Form ════════════════════════════════════════════════════════ */}
      {isFormOpen && (
        <TradeForm
          accounts={accounts}
          activeAccountId={activeAccountId !== 'ALL' ? activeAccountId : (accounts[0]?.id || '')}
          initialData={editingTrade}
          prefillDate={prefillDate}
          onSave={async (t) => {
            try {
              if (!editingTrade && session?.user) { const check = await canUserAddTrade(session.user.id); if (!check.allowed) { setUpgradePrompt('trades'); return; } }
              const updated = editingTrade ? trades.map(old => old.id === t.id ? t : old) : [t, ...trades];
              setTrades(updated);
              requestAnimationFrame(() => saveTrades(updated));
              setIsFormOpen(false); setEditingTrade(null); setPrefillDate(undefined);
              syncSingleTradeToSupabase(t).catch(console.error);
            } catch { alert('Failed to save trade. Please try again.'); }
          }}
          onCancel={() => { setIsFormOpen(false); setEditingTrade(null); setPrefillDate(undefined); }}
        />
      )}

      {isAccountManagerOpen && <AccountManager accounts={accounts} onSave={handleSaveAccount} onClose={() => setIsAccountManagerOpen(false)} plan={userPlan} />}
      {isProfileOpen && <ProfileSettings onClose={() => setIsProfileOpen(false)} plan={userPlan} />}

      {/* ══ Import Overlay ════════════════════════════════════════════════════ */}
      {isImporting && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
          <div className="apple-glass p-10 rounded-[2.5rem] flex flex-col items-center gap-6 shadow-2xl border border-white/20">
            <div className="w-16 h-16 border-4 border-black/5 border-t-black rounded-full animate-spin" />
            <div className="text-center"><h3 className="text-sm font-black uppercase tracking-widest">Parsing Data</h3><p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mt-1">Updating your performance metrics...</p></div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
};

export default App;