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
import { TermsAcceptanceGate } from './components/Legal';
import { Session } from '@supabase/supabase-js';

// ─── Lightweight Toast System ─────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' | 'warn'; }
let toastIdCounter = 0;

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: number) => void }> = ({ toasts, onRemove }) => (
  <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{maxWidth:'320px'}}>
    {toasts.map(t => (
      <div key={t.id} onClick={() => onRemove(t.id)}
        className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-2xl text-[12px] font-bold flex items-start gap-3 cursor-pointer animate-in slide-in-from-top-2 duration-300 ${
          t.type === 'success' ? 'bg-emerald-500 text-white' :
          t.type === 'error'   ? 'bg-rose-500 text-white' :
          t.type === 'warn'    ? 'bg-amber-400 text-black' :
                                 'bg-[#111] text-white'
        }`}>
        <span className="mt-0.5 shrink-0 text-[14px]">
          {t.type === 'success' ? '✓' : t.type === 'error' ? '✗' : t.type === 'warn' ? '⚠' : 'ℹ'}
        </span>
        <span className="leading-snug">{t.message}</span>
      </div>
    ))}
  </div>
);


const UpgradeGate: React.FC<{ feature: string; onUpgrade: () => void }> = ({ feature, onUpgrade }) => (
  <div className="apple-glass rounded-[2rem] max-w-md mx-auto mt-20 p-10 text-center flex flex-col items-center border border-black/5 shadow-sm">
    <div className="w-16 h-16 bg-black/5 rounded-2xl flex items-center justify-center mb-6">
      <svg className="w-8 h-8 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <h2 className="text-xl font-black tracking-tight text-black mb-2">{feature} — Pro Feature</h2>
    <p className="text-xs font-semibold text-black/60 mb-8">Upgrade to Pro to unlock this feature</p>
    <button 
      onClick={onUpgrade}
      className="px-8 py-4 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
    >
      Upgrade to Pro →
    </button>
  </div>
);

// Upgrade gate with feature preview teaser (no lag — no actual component rendering)
const BlurredUpgradeGate: React.FC<{ feature: string; onUpgrade: () => void; children: React.ReactNode }> = ({ feature, onUpgrade }) => (
  <div className="apple-glass rounded-[2rem] max-w-lg mx-auto mt-16 p-12 text-center flex flex-col items-center border border-black/5 shadow-sm animate-in fade-in duration-300">
    {/* Feature preview mockup rows — static, no rendering cost */}
    <div className="w-full mb-8 space-y-3 opacity-25 pointer-events-none select-none">
      <div className="h-10 bg-black/10 rounded-2xl w-full" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 bg-black/10 rounded-2xl" />
        <div className="h-24 bg-black/10 rounded-2xl" />
        <div className="h-24 bg-black/10 rounded-2xl" />
      </div>
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
    <button
      onClick={onUpgrade}
      className="px-10 py-4 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all hover:scale-105"
    >
      Unlock Pro →
    </button>
  </div>
);

// ─── Onboarding Screen ───────────────────────────────────────────────────────
interface OnboardingProps {
  userName: string;
  userEmail: string;
  session: any;
  onComplete: (accounts: any[]) => void;
}
const OnboardingScreen: React.FC<OnboardingProps> = ({ userName, userEmail, onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'account'>('welcome');
  const [accountName, setAccountName] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#111111');
  const [isSaving, setIsSaving] = useState(false);

  const PRESET_COLORS = ['#111111','#2563EB','#16A34A','#DC2626','#7C3AED','#D97706','#0891B2','#BE185D'];

  const handleCreate = async () => {
    if (!accountName.trim()) return;
    setIsSaving(true);
    const acc = {
      id: crypto.randomUUID(),
      name: accountName.trim(),
      initialBalance: Number(balance) || 0,
      currency: 'USD',
      color,
      createdAt: new Date().toISOString()
    };
    await new Promise(r => setTimeout(r, 600)); // smooth feel
    onComplete([acc]);
  };

  return (
    <div className="min-h-[100dvh] bg-[#D6D6D6] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Ambient blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-black/[0.03] rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-black/[0.04] rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {step === 'welcome' ? (
          <div className="apple-glass rounded-[3rem] p-10 shadow-2xl border border-white/60 animate-in zoom-in-95 fade-in duration-700">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-[#111] rounded-[1.8rem] flex items-center justify-center shadow-2xl">
                <ICONS.Logo className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-black tracking-tighter text-black leading-none mb-3">
                Welcome,<br />{userName.split(' ')[0]} 👋
              </h1>
              <p className="text-[11px] font-bold text-black/40 uppercase tracking-[0.25em]">
                Your trading journal is ready
              </p>
            </div>

            {/* Feature pills */}
            <div className="space-y-3 mb-10">
              {[
                { icon: '📊', text: 'Track every trade with P&L, R/R & psychology' },
                { icon: '🤖', text: 'Weekly AI insights powered by Gemini' },
                { icon: '📅', text: 'Calendar, analytics & performance charts' },
                { icon: '🌍', text: 'Forex pips, futures ticks & equity shares' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/60 rounded-2xl px-5 py-3.5">
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-[11px] font-bold text-black/70">{f.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('account')}
              className="w-full py-5 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-[0.98] transition-all hover:brightness-110"
            >
              Set Up My Account →
            </button>
          </div>
        ) : (
          <div className="apple-glass rounded-[3rem] p-10 shadow-2xl border border-white/60 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <button
              onClick={() => setStep('welcome')}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/30 hover:text-black transition-colors mb-8"
            >
              ← Back
            </button>

            <div className="mb-8">
              <h2 className="text-2xl font-black tracking-tighter text-black mb-1">Create Your Account</h2>
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Broker / portfolio scope</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-black/40 uppercase tracking-widest ml-1">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. Prop Firm, Personal, FTMO"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  className="w-full bg-white border border-black/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-black transition-colors text-black placeholder:text-black/25"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-black/40 uppercase tracking-widest ml-1">Starting Capital (optional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-black/30">$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={balance}
                    onChange={e => setBalance(e.target.value)}
                    className="w-full bg-white border border-black/10 rounded-2xl p-4 pl-8 text-sm font-bold outline-none focus:border-black transition-colors text-black"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-black/40 uppercase tracking-widest ml-1">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-9 h-9 rounded-xl transition-all active:scale-90 ${color === c ? 'ring-2 ring-black ring-offset-2 scale-105' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Preview card */}
            {accountName && (
              <div className="mt-6 p-4 bg-white/60 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: color }}>
                  <ICONS.Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-black">{accountName}</p>
                  <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">
                    {balance ? `$${Number(balance).toLocaleString()} Capital` : 'No starting capital set'}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={!accountName.trim() || isSaving}
              className="mt-8 w-full py-5 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting Up...
                </>
              ) : (
                'Launch My Journal →'
              )}
            </button>

            <p className="text-center text-[9px] text-black/25 font-bold uppercase tracking-widest mt-4">
              You can add more accounts later in settings
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sidebar Nav Button with Tooltip ─────────────────────────────────────────
const SidebarNavBtn: React.FC<{
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}> = ({ onClick, active, icon, label }) => (
  <div className="relative group/nav w-full flex justify-center">
    <button
      onClick={onClick}
      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 relative
        ${active
          ? 'bg-white text-[#111111] shadow-xl scale-105'
          : 'text-white/40 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95'
        }`}
    >
      {icon}
      {/* Active indicator dot */}
      {active && (
        <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-full" />
      )}
    </button>
    {/* Tooltip */}
    <div className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 opacity-0 group-hover/nav:opacity-100 transition-all duration-200 translate-x-[-4px] group-hover/nav:translate-x-0 z-50">
      <div className="bg-[#111] text-white text-[9px] font-black uppercase tracking-[0.15em] px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111]" />
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('DASHBOARD');
  const [displayUnit, setDisplayUnit] = useState<PerformanceUnit>('CURRENCY');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('ALL');
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // Onboarding: shown as a full intercepting screen for new users before accessing the app
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Terms acceptance: required once per account (checked via localStorage)
  const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isMobileProfileSheetOpen, setIsMobileProfileSheetOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [upgradePrompt, setUpgradePrompt] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Handle Stripe redirect back to app after successful payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      // Refresh plan from Supabase (webhook should have updated it)
      setTimeout(async () => {
        if (session?.user?.id) {
          const plan = await getUserPlan(session.user.id);
          setUserPlan(plan);
        }
        toast('🎉 Welcome to Pro! All features are now unlocked.', 'success', 6000);
      }, 1500);
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('upgrade') === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('portal') === 'returned') {
      // User returned from Stripe Customer Portal (may have cancelled subscription)
      setTimeout(async () => {
        if (session?.user?.id) {
          const plan = await getUserPlan(session.user.id);
          setUserPlan(plan);
          if (plan === 'free') {
            toast('Subscription updated. You\'re now on the Free plan.', 'info', 5000);
          }
        }
      }, 1500);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [session]);

  const toast = (message: string, type: Toast['type'] = 'info', duration = 3500) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };
  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const randomQuote = useMemo(() => TRADER_QUOTES[Math.floor(Math.random() * TRADER_QUOTES.length)], []);

  const filteredTrades = useMemo(() => {
    if (activeAccountId === 'ALL') return trades;
    return trades.filter(t => t.accountId === activeAccountId);
  }, [trades, activeAccountId]);

  const activeAccount = useMemo(() => 
    accounts.find(a => a.id === activeAccountId), 
  [accounts, activeAccountId]);

  const startingEquity = useMemo(() => activeAccount 
    ? activeAccount.initialBalance 
    : accounts.reduce((sum, a) => sum + a.initialBalance, 0), [activeAccount, accounts]);

  const controlStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const todayTrades = filteredTrades.filter(t => t.date === todayStr);
    const todayPnL = todayTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    
    const initialBalance = startingEquity;
    const totalPnL = filteredTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const currentBalance = initialBalance + totalPnL;
    
    const todayPct = initialBalance > 0 ? (todayPnL / initialBalance) * 100 : 0;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekTrades = filteredTrades.filter(t => new Date(t.date) >= weekAgo);
    
    const wins = filteredTrades.filter(t => t.pnl > 0).length;
    const winRate = filteredTrades.length > 0 ? (wins / filteredTrades.length) * 100 : 0;

    const recentTrades = [...filteredTrades]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 2);

    const alerts = [];
    let currentLossStreak = 0;
    const sortedByTime = [...filteredTrades].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    for (const t of sortedByTime) {
      if (t.pnl < 0) currentLossStreak++;
      else if (t.pnl > 0) break;
    }

    if (currentLossStreak >= 2) {
      alerts.push({ type: 'warning', text: `${currentLossStreak}-trade loss streak`, icon: <ICONS.Target className="w-3 h-3 text-rose-500" /> });
    }
    
    if (todayPnL > 0 && todayTrades.length > 0) {
      alerts.push({ type: 'insight', text: `Edge identified: Session +$${Math.round(todayPnL)}`, icon: <ICONS.Win className="w-3 h-3 text-emerald-500" /> });
    } else if (todayPnL < -200) {
       alerts.push({ type: 'warning', text: `Daily threshold warning`, icon: <ICONS.Info className="w-3 h-3 text-amber-500" /> });
    }

    return {
      currentBalance,
      todayPnL,
      todayPct,
      todayCount: todayTrades.length,
      weekCount: weekTrades.length,
      winRate,
      recentTrades,
      alerts
    };
  }, [filteredTrades, startingEquity]);

  const handleAuthCleanup = async () => {
    const client = getSupabaseClient();
    clearAuthSession();
    if (client) await client.auth.signOut();
    setSession(null);
    setTrades(loadTrades());
    setIsAuthLoading(false);
  };

  const initializeApp = async () => {
    setIsAuthLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      const storedAccounts = localStorage.getItem('tf_accounts');
      if (storedAccounts) setAccounts(JSON.parse(storedAccounts));
      setTrades(loadTrades());
      setIsAuthLoading(false);
      return;
    }

    try {
      const { data: { session: s }, error: sessionError } = await client.auth.getSession();
      
      if (sessionError) {
        const errLower = sessionError.message.toLowerCase();
        if (
          errLower.includes("refresh_token") || 
          errLower.includes("not found") ||
          errLower.includes("invalid_grant") ||
          errLower.includes("expired")
        ) {
          await handleAuthCleanup();
          return;
        }
      } 
      
      setSession(s);

      // Terms acceptance: only required for users who signed up AFTER Feb 1 2025
      // Check localStorage first (fast), then Supabase as source of truth
      if (s) {
        const termsTs = localStorage.getItem('tf_terms_accepted');
        if (!termsTs) {
          // Check if user created account before terms were introduced
          const userCreatedAt = s.user?.created_at || '';
          const termsIntroduced = new Date('2025-02-01T00:00:00Z');
          const accountCreated = userCreatedAt ? new Date(userCreatedAt) : new Date();
          
          if (accountCreated < termsIntroduced) {
            // Existing user — auto-accept, don't show gate
            localStorage.setItem('tf_terms_accepted', 'legacy-auto-accepted');
          } else {
            // Check Supabase profiles for stored acceptance
            const supabase = getSupabaseClient();
            if (supabase) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('terms_accepted_at')
                .eq('id', s.user.id)
                .single();
              
              if (profile?.terms_accepted_at) {
                // Already accepted on another device — sync to localStorage
                localStorage.setItem('tf_terms_accepted', profile.terms_accepted_at);
              } else {
                // Genuinely new user who hasn't accepted yet
                setNeedsTermsAcceptance(true);
              }
            }
          }
        }
      }

      client.auth.onAuthStateChange(async (event, newSession) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setTrades([]);
          setAccounts([]);
          setUserPlan('free');
        } else if (newSession) {
          setSession(newSession);
          const plan = await getUserPlan(newSession.user.id);
          setUserPlan(plan);
        }
      });
      
      if (s) {
        try {
          const [remoteAccounts, remoteTrades, plan] = await Promise.all([
            getSupabaseAccounts(),
            getSupabaseTrades(),
            getUserPlan(s.user.id)
          ]);

          setUserPlan(plan);

          if (remoteAccounts) {
            setAccounts(remoteAccounts);
            localStorage.setItem('tf_accounts', JSON.stringify(remoteAccounts));
            // First-time user: no accounts set up yet → show onboarding
            if (remoteAccounts.length === 0) {
              setShowOnboarding(true);
            }
          } else {
            const storedAccounts = localStorage.getItem('tf_accounts');
            if (storedAccounts) setAccounts(JSON.parse(storedAccounts));
            else {
              // No accounts anywhere → first time setup
              setShowOnboarding(true);
            }
          }

          if (remoteTrades) {
            setTrades(remoteTrades);
            saveTrades(remoteTrades);
          } else {
            setTrades(loadTrades());
          }
        } catch (fetchErr: any) {
          if (fetchErr.message === 'AUTH_ERROR') {
             await handleAuthCleanup();
             return;
          }
          throw fetchErr;
        }
      } else {
        const storedAccounts = localStorage.getItem('tf_accounts');
        if (storedAccounts) setAccounts(JSON.parse(storedAccounts));
        setTrades(loadTrades());
      }
    } catch (e) {
      await handleAuthCleanup();
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => { initializeApp(); }, []);

  // Close account manager and mobile overlays when navigating to a different page
  useEffect(() => {
    setIsAccountManagerOpen(false);
    setIsMobileMoreOpen(false);
  }, [activeView]);

  const handleLogout = async () => {
    try {
      const client = getSupabaseClient();
      if (client) {
        await Promise.race([
          client.auth.signOut(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]).catch(() => {});
      }
    } catch (_) {}
    clearAuthSession();
    // Clear all local storage keys related to app
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('tf_') || key.startsWith('sb-'))) keysToRemove.push(key);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) {}
    setSession(null);
    setUserPlan('free');
    setTrades([]);
    setAccounts([]);
    setActiveAccountId('ALL');
    setActiveView('DASHBOARD');
  };

  const handleDeleteTrade = async (id: string) => {
    await deleteSupabaseTrade(id);
    const updated = trades.filter(t => t.id !== id);
    setTrades(updated);
    saveTrades(updated);
  };

  const handleSaveAccount = async (newAccounts: Account[]) => {
    if (activeAccountId !== 'ALL' && !newAccounts.some(a => a.id === activeAccountId)) {
      setActiveAccountId('ALL');
    }
    if (showOnboarding && newAccounts.length > 0) {
      setShowOnboarding(false);
      toast(`✓ Account set up! Welcome to TradeFlow.`, 'success', 4000);
    }
    setAccounts(newAccounts);
    localStorage.setItem('tf_accounts', JSON.stringify(newAccounts));
    if (session) await syncAccountsToSupabase(newAccounts);
  };

  // Handler: Google Sheets Sync
  const handleExternalSync = async () => {
    const sheetUrl = localStorage.getItem('tf_sheet_url');
    if (!sheetUrl) {
      toast('No Google Sheet linked. Add a sheet URL in Settings first.', 'warn');
      return;
    }
    setIsSyncing(true);
    try {
      const { fetchTradesFromSheets } = await import('./services/sync');
      const syncedTrades = await fetchTradesFromSheets({ sheetUrl, lastSynced: null, autoSync: false });
      if (syncedTrades && syncedTrades.length > 0) {
        // Assign active account ID to imported trades
        const withAccount = syncedTrades.map(t => ({
          ...t,
          accountId: t.accountId || (accounts[0]?.id || '')
        }));
        const merged = [...withAccount, ...trades.filter(
          existing => !withAccount.some(imp => imp.date === existing.date && imp.symbol === existing.symbol)
        )];
        setTrades(merged);
        saveTrades(merged);
        await syncTradesToSupabase(merged);
        toast(`✓ Synced ${syncedTrades.length} trades from Google Sheets`, 'success');
      } else if (syncedTrades !== null) {
        toast('Sheet synced but no trades found. Check your sheet format.', 'warn');
      } else {
        toast('Sync failed. Make sure your sheet is shared to "Anyone with the link".', 'error');
      }
    } catch (e: any) {
      if (e.message === 'AUTH_ERROR') {
        await handleAuthCleanup();
        return;
      }
      toast(`Sync error: ${e.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Cloud Refresh
  const handleCloudRefresh = async () => {
    if (!session) return;
    setIsCloudSyncing(true);
    try {
      const [remoteAccounts, remoteTrades] = await Promise.all([
        getSupabaseAccounts(),
        getSupabaseTrades()
      ]);
      if (remoteAccounts) {
        setAccounts(remoteAccounts);
        localStorage.setItem('tf_accounts', JSON.stringify(remoteAccounts));
      }
      if (remoteTrades) {
        setTrades(remoteTrades);
        saveTrades(remoteTrades);
      }
      toast('Cloud data refreshed', 'success');
    } catch (e: any) {
      if (e.message === 'AUTH_ERROR') {
        await handleAuthCleanup();
        return;
      }
      toast('Cloud refresh failed. Check your connection.', 'error');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Handler: CSV Import
  const handleImportCSV = async (csvText: string) => {
    setIsImporting(true);
    try {
      const { parseCSV } = await import('./services/storage');
      const imported = parseCSV(csvText, activeAccountId !== 'ALL' ? activeAccountId : (accounts[0]?.id || ''));
      if (imported.length === 0) {
        toast('No trades found in CSV. Check the file format.', 'warn');
        setIsImporting(false);
        return;
      }
      const merged = [...imported, ...trades];
      setTrades(merged);
      saveTrades(merged);
      await syncTradesToSupabase(merged);
      toast(`✓ Imported ${imported.length} trades`, 'success');
    } catch (e: any) {
      if (e.message === 'AUTH_ERROR') {
        await handleAuthCleanup();
        return;
      }
      toast(`Import failed: ${e.message}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#D6D6D6] flex flex-col items-center justify-center overflow-hidden">
        <ICONS.Logo className="w-12 h-12 animate-pulse mb-6 opacity-40" />
        <p className="text-[10px] font-black text-black opacity-40 uppercase tracking-[0.3em]">Initializing Studio...</p>
      </div>
    );
  }

  if (!session) return <Auth onAuthSuccess={initializeApp} />;

  const userName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'John Doe';
  const userEmail = session?.user?.email || 'user@flow.com';

  // ─── Terms acceptance gate: required once for all users ─────────────────────
  if (needsTermsAcceptance) {
    return (
      <TermsAcceptanceGate
        userName={userName}
        onAccept={async () => {
          const ts = new Date().toISOString();
          localStorage.setItem('tf_terms_accepted', ts);
          // Persist to Supabase so acceptance survives across devices/browsers
          const supabase = getSupabaseClient();
          if (supabase && session?.user?.id) {
            await supabase.from('profiles').update({ terms_accepted_at: ts }).eq('id', session.user.id);
          }
          setNeedsTermsAcceptance(false);
        }}
      />
    );
  }

  // ─── Onboarding: intercepts app for brand-new users with no accounts ────────
  if (showOnboarding) {
    return (
      <OnboardingScreen
        userName={userName}
        userEmail={userEmail}
        session={session}
        onComplete={(newAccounts) => {
          handleSaveAccount(newAccounts);
        }}
      />
    );
  }

  return (
    <div className="flex min-h-[100dvh] h-[100dvh] bg-[#D6D6D6] text-black overflow-hidden font-sans pt-safe pb-safe selection:bg-black/10">
      
      {/* Background Safe Area Glass */}
      <div className="fixed top-0 left-0 right-0 h-[var(--sat)] safe-area-glass z-[999] lg:hidden pointer-events-none" />
      <div className="fixed bottom-0 left-0 right-0 h-[var(--sab)] safe-area-glass z-[999] lg:hidden pointer-events-none" />

      {/* Primary Sidebar Rail (Desktop) */}
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
          </nav>
        </div>

        <div className="flex flex-col items-center gap-1 w-full mt-auto">
          <SidebarNavBtn onClick={() => setIsAccountManagerOpen(true)} active={false} icon={<ICONS.Dollar className="w-5 h-5" />} label="Accounts" />
          <SidebarNavBtn onClick={() => setActiveView('SETTINGS')} active={activeView === 'SETTINGS'} icon={<ICONS.Settings className="w-5 h-5" />} label="Settings" />
          <div className="relative group/nav w-full flex justify-center">
            <button onClick={handleLogout} className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 text-rose-400/50 hover:text-rose-400 hover:bg-rose-400/10 hover:scale-105 active:scale-95">
              <ICONS.LogOut className="w-5 h-5" />
            </button>
            <div className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 opacity-0 group-hover/nav:opacity-100 transition-all duration-200 z-50">
              <div className="bg-rose-600 text-white text-[9px] font-black uppercase tracking-[0.15em] px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">
                Sign Out
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-rose-600" />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Secondary Sidebar (Profile / Stats) */}
      <aside className="hidden lg:flex tf-sidebar lg:left-16 top-4 bottom-4 flex-col lg:w-[280px] apple-glass ambient-shadow overflow-hidden">
        <div className="p-8 flex items-center gap-3 cursor-pointer hover:bg-black/5 transition-colors group flex-shrink-0" onClick={() => setIsProfileOpen(true)}>
          <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center overflow-hidden border border-black/5 shadow-sm">
            <img src={session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${userName}`} alt="Avatar" />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold text-black tracking-tight flex items-center gap-2 truncate">
              {userName}
              {userPlan === 'pro' && (
                <span className="px-2 py-0.5 bg-gradient-to-tr from-black to-slate-800 text-white text-[7px] font-black uppercase tracking-[0.15em] rounded-full shrink-0 shadow-sm border border-white/20">PRO</span>
              )}
            </h2>
            <p className="text-[10px] text-black/30 font-semibold truncate">{userEmail}</p>
          </div>
        </div>

        <div className="px-4 flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-6">
          <div className="space-y-3">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">Active Scope</h3>
                <button onClick={() => setIsAccountManagerOpen(true)} className="text-[8px] font-black uppercase text-black/40 hover:text-black">Switch</button>
             </div>
             <div className="ceramic-white p-5 rounded-[2rem] border border-black/5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeAccount?.color || '#000' }} />
                      <span className="text-[11px] font-black text-black truncate max-w-[120px]">{activeAccount?.name || 'Overall Portfolio'}</span>
                   </div>
                   <div className={`px-2 py-0.5 rounded-full text-[8px] font-black ${controlStats.todayPnL >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                      {controlStats.todayPnL >= 0 ? '↑' : '↓'} {Math.abs(controlStats.todayPct).toFixed(2)}%
                   </div>
                </div>
                <div>
                   <p className="text-[20px] font-black tracking-tighter leading-none">${controlStats.currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                   <p className="text-[9px] font-bold text-black/20 uppercase tracking-widest mt-1">
                      Today: <span className={controlStats.todayPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {controlStats.todayPnL >= 0 ? '+' : '-'}${Math.abs(Math.round(controlStats.todayPnL)).toLocaleString()}
                      </span>
                   </p>
                </div>
             </div>
          </div>

          <div className="space-y-3">
             <h3 className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em] px-2">Velocity Metrics</h3>
             <div className="grid grid-cols-2 gap-3">
                <div className="apple-glass p-4 rounded-3xl border-white/40">
                   <p className="text-[8px] font-black text-black/30 uppercase tracking-widest mb-1">Today</p>
                   <p className="text-sm font-black">{controlStats.todayCount} Trades</p>
                </div>
                <div className="apple-glass p-4 rounded-3xl border-white/40">
                   <p className="text-[8px] font-black text-black/30 uppercase tracking-widest mb-1">Weekly</p>
                   <p className="text-sm font-black">{controlStats.weekCount} Vol.</p>
                </div>
                <div className="apple-glass p-4 rounded-3xl border-white/40 col-span-2 flex items-center justify-between">
                   <div>
                      <p className="text-[8px] font-black text-black/30 uppercase tracking-widest mb-0.5">Efficiency</p>
                      <p className="text-sm font-black">{controlStats.winRate.toFixed(1)}% Win Rate</p>
                   </div>
                   <ICONS.Insights className="w-5 h-5 text-black/10" />
                </div>
             </div>
          </div>

          {controlStats.alerts.length > 0 && (
            <div className="space-y-3">
               <h3 className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em] px-2">Operational Alerts</h3>
               <div className="space-y-2">
                  {controlStats.alerts.map((alert, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border ${alert.type === 'warning' ? 'bg-rose-500/[0.03] border-rose-500/10' : 'bg-emerald-500/[0.03] border-emerald-500/10'}`}>
                       <div className="shrink-0">{alert.icon}</div>
                       <p className="text-[10px] font-black text-black/70 italic leading-none">{alert.text}</p>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>

        <div className="p-4 flex-shrink-0 border-t border-black/5 bg-transparent">
          <div className="p-5 ceramic-white rounded-[2rem] shadow-sm relative overflow-hidden group border border-black/5">
            <ICONS.Quote className="absolute -right-2 -bottom-2 w-16 h-16 text-black/[0.05] -rotate-12 transition-transform duration-700 group-hover:scale-110" />
            <p className="text-[11px] text-black/60 font-black italic leading-relaxed relative z-10">"{randomQuote.text}"</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area - Standardized with Sidebar Rail/Sidebar */}
      <div className="flex-1 flex flex-col apple-glass ambient-shadow overflow-hidden relative border-none z-[1] lg:ml-[calc(4rem+280px+16px)] lg:mr-4 lg:mt-4 lg:mb-4 lg:h-[calc(100dvh-32px)]">
        
        {/* Page Header */}
        {activeView !== 'SETTINGS' && (
          <header className="flex-shrink-0 z-[100] lg:relative lg:bg-transparent lg:border-none lg:backdrop-blur-none fixed top-0 left-0 right-0 frosted-glass-header lg:frosted-glass-none px-6 sm:px-8 flex flex-col gap-4 border-none">
            <div className="flex items-center justify-between h-[56px] lg:h-auto lg:mt-6">
              <div className="flex lg:hidden items-center gap-3 cursor-pointer active:opacity-70 transition-opacity min-w-0" onClick={() => setIsMobileProfileSheetOpen(true)}>
                <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center overflow-hidden border border-black/5 shrink-0 shadow-sm">
                  <img src={session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${userName}`} alt="Avatar" />
                </div>
                <div className="min-w-0">
                   <h3 className="text-[14px] font-bold text-black flex items-center gap-2">
                      <span className="truncate max-w-[100px] sm:max-w-[140px]">{userName}</span>
                      {userPlan === 'pro' && (
                        <span className="px-2 py-0.5 bg-black text-white text-[7px] font-black uppercase tracking-[0.1em] rounded-full shrink-0 shadow-md border border-white/10">PRO</span>
                      )}
                   </h3>
                </div>
              </div>

              <h1 className="hidden lg:block text-2xl font-bold tracking-tight text-black">
                {activeView === 'DASHBOARD' ? 'Performance' : activeView === 'TRADES_LOG' ? 'Library' : activeView === 'CALENDAR' ? 'Monthly Scope' : activeView === 'PSYCHOLOGY' ? 'Psychology' : activeView === 'AI_INTELLIGENCE' ? 'Intelligence' : 'Analytics'}
              </h1>
              
              <div className="flex items-center gap-2 sm:gap-4">
                 <button onClick={() => {setEditingTrade(null); setIsFormOpen(true);}} className="hidden sm:flex px-5 py-2.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg items-center gap-2 transition-transform active:scale-95">
                   <ICONS.Plus className="w-3 h-3" /> New Entry
                 </button>
                 
                 <div className="flex items-center gap-2 lg:hidden">
                   <button onClick={() => {setEditingTrade(null); setIsFormOpen(true);}} className="w-9 h-9 flex items-center justify-center bg-black text-white rounded-full shadow-lg active:scale-90 transition-transform"><ICONS.Plus className="w-4 h-4" /></button>
                 </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button onClick={() => setActiveAccountId('ALL')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all border ${activeAccountId === 'ALL' ? 'bg-black text-white border-black' : 'bg-black/5 text-black/40 border-transparent'}`}>Overall</button>
                {accounts.map(acc => (
                  <button key={acc.id} onClick={() => setActiveAccountId(acc.id)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-2 border ${activeAccountId === acc.id ? 'bg-black text-white border-black' : 'bg-black/5 text-black/40 border-transparent'}`}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: acc.color }} />
                    {acc.name}
                  </button>
                ))}
              </div>
            </div>
          </header>
        )}

        <main className={`flex-1 overflow-y-auto touch-scroll will-change-transform pb-nav-safe lg:pb-12 ${activeView === 'SETTINGS' ? 'p-0 bg-[#EFEFEF]' : 'p-4 sm:p-6 md:p-10'} ${activeView !== 'SETTINGS' ? 'pt-[calc(56px+var(--sat)+16px)] lg:pt-6' : 'pt-0'} min-h-0`}>
          <div className={`${activeView === 'SETTINGS' ? 'h-full' : 'max-w-6xl mx-auto space-y-6 sm:space-y-8'}`}>
             <div key={activeView} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             {activeView === 'DASHBOARD' && (
               <>
                 <Dashboard displayUnit={displayUnit} setDisplayUnit={setDisplayUnit} trades={filteredTrades} activeAccount={activeAccount} accounts={accounts} onTradeEdit={(t) => {setEditingTrade(t); setIsFormOpen(true);}} onTradeDelete={handleDeleteTrade} />
                 {userPlan === 'pro' && (
                   <div className="mt-8 pt-8 border-t border-black/5 text-center flex flex-col items-center gap-2 opacity-40">
                      <ICONS.Zap className="w-4 h-4 text-emerald-600" />
                      <p className="text-[9px] font-black uppercase tracking-[0.3em]">Pro Access Active • Infinite Ops</p>
                   </div>
                 )}
               </>
             )}
             {activeView === 'TRADES_LOG' && <TradeLog displayUnit={displayUnit} trades={filteredTrades} onEdit={(t) => {setEditingTrade(t); setIsFormOpen(true);}} onDelete={handleDeleteTrade} />}
             {activeView === 'CALENDAR' && <Calendar trades={filteredTrades} displayUnit={displayUnit} startingEquity={startingEquity} onTradeEdit={(t) => {setEditingTrade(t); setIsFormOpen(true);}} onTradeDelete={handleDeleteTrade} />}
             {activeView === 'ANALYTICS' && (
               userPlan === 'pro' 
                 ? <Analytics trades={filteredTrades} />
                 : <BlurredUpgradeGate feature="Analytics" onUpgrade={() => setUpgradePrompt('analytics')}>
                     <Analytics trades={filteredTrades} />
                   </BlurredUpgradeGate>
             )}
             {activeView === 'PSYCHOLOGY' && (
               userPlan === 'pro' 
                 ? <Psychology trades={filteredTrades} />
                 : <BlurredUpgradeGate feature="Psychology Tracker" onUpgrade={() => setUpgradePrompt('psychology')}>
                     <Psychology trades={filteredTrades} />
                   </BlurredUpgradeGate>
             )}
             {activeView === 'AI_INTELLIGENCE' && (
               userPlan === 'pro' 
                 ? <AIPage trades={filteredTrades} />
                 : <UpgradeGate feature="AI Intelligence" onUpgrade={() => setUpgradePrompt('ai')} />
             )}
             {activeView === 'SETTINGS' && (
               <div className="px-6 sm:px-10 lg:px-0">
                 <SyncSettings
                   config={{sheetUrl: localStorage.getItem('tf_sheet_url') || '', lastSynced: null, autoSync: false}}
                   onSave={(cfg) => { if (cfg.sheetUrl) localStorage.setItem('tf_sheet_url', cfg.sheetUrl); }}
                   onClose={() => setActiveView('DASHBOARD')}
                   onExportCSV={() => exportToCSV(trades)}
                   onExternalSync={handleExternalSync}
                   onCloudRefresh={handleCloudRefresh}
                   onImportCSV={handleImportCSV}
                   isSyncing={isSyncing}
                   isCloudSyncing={isCloudSyncing}
                   hasSession={!!session}
                   displayUnit={displayUnit}
                   setDisplayUnit={setDisplayUnit}
                   userPlan={userPlan}
                   activeAccountId={activeAccountId}
                 />
               </div>
             )}
             </div>
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] frosted-glass-nav h-[calc(64px+var(--sab))] flex items-start justify-around px-1 pt-2">
          {([
            { view: 'DASHBOARD' as ViewType,    icon: <ICONS.Dashboard className="w-5 h-5" /> },
            { view: 'TRADES_LOG' as ViewType,   icon: <ICONS.Journal className="w-5 h-5" /> },
            { view: 'CALENDAR' as ViewType,     icon: <ICONS.Calendar className="w-5 h-5" /> },
            { view: 'ANALYTICS' as ViewType,    icon: <ICONS.Performance className="w-5 h-5" /> },
          ]).map(({ view, icon }) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`relative flex flex-col items-center p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                activeView === view ? 'text-black' : 'text-black/25 hover:text-black/50'
              }`}
            >
              {icon}
              {activeView === view && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-black animate-in zoom-in-95 duration-200" />
              )}
            </button>
          ))}
          {/* More menu — Psychology + AI + Settings + Account collapsed here on mobile */}
          <div className="relative">
            <button
              onClick={() => setIsMobileMoreOpen(prev => !prev)}
              className={`p-2.5 rounded-xl transition-all active:scale-90 relative ${['PSYCHOLOGY','AI_INTELLIGENCE','SETTINGS'].includes(activeView) ? 'text-black bg-black/5' : 'text-black/30'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>
              {userPlan === 'free' && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-black/20" />}
            </button>
            {isMobileMoreOpen && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-black/5 overflow-hidden animate-in slide-in-from-bottom-2 duration-200 min-w-[170px]">
                <button
                  onClick={() => { setActiveView('PSYCHOLOGY'); setIsMobileMoreOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${activeView === 'PSYCHOLOGY' ? 'bg-black/5 text-black' : 'text-black/40 hover:text-black hover:bg-black/3'}`}
                >
                  <ICONS.Psychology className="w-4 h-4" />
                  Psychology
                  {userPlan === 'free' && <span className="ml-auto text-[8px] bg-black text-white px-1.5 py-0.5 rounded-full">PRO</span>}
                </button>
                <button
                  onClick={() => { setActiveView('AI_INTELLIGENCE'); setIsMobileMoreOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${activeView === 'AI_INTELLIGENCE' ? 'bg-black/5 text-black' : 'text-black/40 hover:text-black hover:bg-black/3'}`}
                >
                  <ICONS.AIIntelligence className="w-4 h-4" />
                  AI Intel
                  {userPlan === 'free' && <span className="ml-auto text-[8px] bg-black text-white px-1.5 py-0.5 rounded-full">PRO</span>}
                </button>
                <div className="border-t border-black/5 mx-3" />
                <button
                  onClick={() => { setIsAccountManagerOpen(true); setIsMobileMoreOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black/40 hover:text-black hover:bg-black/3 transition-colors"
                >
                  <ICONS.Dollar className="w-4 h-4" />
                  Accounts
                </button>
                <button
                  onClick={() => { setActiveView('SETTINGS'); setIsMobileMoreOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${activeView === 'SETTINGS' ? 'bg-black/5 text-black' : 'text-black/40 hover:text-black hover:bg-black/3'}`}
                >
                  <ICONS.Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="border-t border-black/5 mx-3" />
                <button
                  onClick={() => { handleLogout(); setIsMobileMoreOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <ICONS.LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
      {isMobileProfileSheetOpen && (
        <div className="fixed inset-0 z-[150] lg:hidden animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileProfileSheetOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
            <div className={`p-8 pt-6 pb-8 ${userPlan === 'pro' ? 'bg-[#111111] text-white' : 'bg-white text-black'}`}>
              <div className={`w-12 h-1.5 rounded-full mx-auto mb-8 ${userPlan === 'pro' ? 'bg-white/10' : 'bg-black/10'}`} />
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center overflow-hidden border shrink-0 shadow-md ${userPlan === 'pro' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                  <img src={session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${userName}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-col mb-1">
                    <h3 className={`text-xl font-black tracking-tight truncate ${userPlan === 'pro' ? 'text-white' : 'text-black'}`}>{userName}</h3>
                    {userPlan === 'pro' ? (
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mt-1">PRO MEMBER</span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mt-1">FREE MEMBER</span>
                    )}
                  </div>
                  <p className={`text-[11px] font-bold truncate ${userPlan === 'pro' ? 'text-white/40' : 'text-black/40'}`}>{userEmail}</p>
                </div>
              </div>
            </div>

            <div className="p-8 pt-6 pb-safe space-y-3 bg-white">
              <button onClick={() => { setIsMobileProfileSheetOpen(false); setIsAccountManagerOpen(true); }} className="w-full flex items-center justify-between p-5 bg-black/5 hover:bg-black/10 rounded-2xl transition-all active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <ICONS.Dollar className="w-5 h-5 text-black/60" />
                  <span className="text-sm font-bold text-black uppercase tracking-tight">Switch Account</span>
                </div>
                <ICONS.ChevronRight className="w-4 h-4 text-black/20" />
              </button>
              <button onClick={() => { setIsMobileProfileSheetOpen(false); setActiveView('SETTINGS'); }} className="w-full flex items-center justify-between p-5 bg-black/5 hover:bg-black/10 rounded-2xl transition-all active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <ICONS.Settings className="w-5 h-5 text-black/60" />
                  <span className="text-sm font-bold text-black uppercase tracking-tight">Terminal Settings</span>
                </div>
                <ICONS.ChevronRight className="w-4 h-4 text-black/20" />
              </button>
              <div className="pt-4">
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-5 bg-rose-500/10 text-rose-600 rounded-2xl transition-all active:scale-[0.98]">
                  <ICONS.LogOut className="w-5 h-5" />
                  <span className="text-sm font-black uppercase tracking-widest">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {upgradePrompt !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUpgradePrompt(null)} />
          <div className="apple-glass w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 text-center border-white/20">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"><ICONS.Zap className="w-8 h-8 text-white" /></div>
            <h3 className="text-xl font-black tracking-tight text-black mb-2">
              {upgradePrompt === 'trades' ? 'Trade Limit Reached' :
               upgradePrompt === 'analytics' ? 'Analytics is Pro' :
               upgradePrompt === 'psychology' ? 'Psychology Tracker is Pro' :
               upgradePrompt === 'ai' ? 'AI Intelligence is Pro' : 'Upgrade to Pro'}
            </h3>
            <p className="text-xs font-semibold text-black/60 leading-relaxed mb-8">
              {upgradePrompt === 'trades'
                ? "You\'ve used all 15 trades this month. Upgrade to Pro for unlimited trades, AI insights, and advanced analytics."
                : upgradePrompt === 'analytics'
                ? 'Unlock setup performance, session analysis, R-multiple distribution, and day-of-week patterns.'
                : upgradePrompt === 'psychology'
                ? 'Track pre/post-trade mood, emotional states, plan adherence, and quantify the cost of trading mistakes.'
                : 'Let Gemini AI analyze your journal to surface hidden patterns and personalized recommendations.'}
            </p>
            <div className="space-y-3">
              <button onClick={() => { if (session?.user?.id) startStripeCheckout(session.user.id); setUpgradePrompt(null); }} className="w-full py-4 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Upgrade to Pro</button>
              <button onClick={() => setUpgradePrompt(null)} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors">Maybe Later</button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <TradeForm 
          accounts={accounts}
          activeAccountId={activeAccountId !== 'ALL' ? activeAccountId : (accounts[0]?.id || '')}
          onSave={async (t) => {
            try {
              // Check trade limit for free users (existing logic preserved)
              if (!editingTrade && session?.user) {
                const check = await canUserAddTrade(session.user.id);
                if (!check.allowed) {
                  setUpgradePrompt('trades');
                  return;
                }
              }
              
              // Update local state immediately (existing logic preserved)
              const updated = editingTrade ? trades.map(old => old.id === t.id ? t : old) : [t, ...trades];
              setTrades(updated); 
              saveTrades(updated);
              
              // ✅ FIX: Close form BEFORE sync (fixes "form doesn't close" issue)
              setIsFormOpen(false); 
              setEditingTrade(null);
              
              // ✅ FIX: Sync in background (fixes dashboard lag)
              syncSingleTradeToSupabase(t).catch(err => {
                console.error('Background sync failed:', err);
              });
              
            } catch (error) {
              console.error('Save error:', error);
              alert('Failed to save trade. Please try again.');
            }
          }} 
          onCancel={() => { setIsFormOpen(false); setEditingTrade(null); }} 
          initialData={editingTrade} 
        />
      )}
      
      {isAccountManagerOpen && <AccountManager accounts={accounts} onSave={handleSaveAccount} onClose={() => setIsAccountManagerOpen(false)} plan={userPlan} />}
      {isProfileOpen && <ProfileSettings onClose={() => setIsProfileOpen(false)} plan={userPlan} />}
      
      {isImporting && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
          <div className="apple-glass p-10 rounded-[2.5rem] flex flex-col items-center gap-6 shadow-2xl border border-white/20">
            <div className="w-16 h-16 border-4 border-black/5 border-t-black rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="text-sm font-black uppercase tracking-widest">Parsing Data</h3>
              <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mt-1">Updating your performance metrics...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;