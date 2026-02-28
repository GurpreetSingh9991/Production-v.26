import React, { useState } from 'react';
import { ICONS } from '../constants';
import { signIn, signUp, signInWithGoogle, getSupabaseClient } from '../services/supabase';
import { LegalModal } from './Legal';

type LegalDoc = 'privacy' | 'terms';

interface AuthProps {
  onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [openLegal, setOpenLegal] = useState<LegalDoc | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const client = getSupabaseClient();

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { error: authError } = await signInWithGoogle();
      if (authError) throw authError;
      // Redirect happens automatically
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase!.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) {
      setError("Terminal infrastructure offline.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: authError } = await signIn(email, password);
        if (authError) throw authError;
        onAuthSuccess();
      } else {
        if (!termsAccepted) {
          setError('You must accept the Terms & Conditions and Privacy Policy to register.');
          setIsLoading(false);
          return;
        }
        const { error: authError, data } = await signUp(email, password, name || "Trader", "");
        if (authError) throw authError;
        
        if (data?.user && !data?.session) {
          setSignupSuccess(true);
        } else {
          onAuthSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-[#D6D6D6] flex items-center justify-center p-6 pt-safe pb-safe selection:bg-black/10">
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-black/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="w-full max-w-md apple-glass rounded-[3.5rem] p-10 md:p-14 ambient-shadow relative overflow-hidden animate-in zoom-in-95 duration-700 border-white/40 text-center">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-black rounded-[1.5rem] flex items-center justify-center mb-6 shadow-2xl" >
               <ICONS.Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tighter text-black leading-none mb-4">Check Your Inbox</h2>
            <p className="text-[10px] font-bold text-black/40 uppercase tracking-[0.2em] max-w-xs mx-auto">
              Protocol verification required for security clearance.
            </p>
          </div>

          <div className="ceramic-white p-6 rounded-[2rem] border border-black/5 mb-8">
            <p className="text-xs font-semibold text-black leading-relaxed italic">
              We've dispatched a confirmation link to <span className="font-black not-italic text-black underline decoration-black/20 decoration-2 underline-offset-4">{email}</span>. Please click it to activate your terminal access.
            </p>
          </div>

          <button 
            onClick={() => {
              setSignupSuccess(false);
              setIsLogin(true);
            }}
            className="group flex items-center bg-black rounded-full p-1 pr-2 pl-6 hover:pr-4 transition-all duration-500 shadow-2xl active:scale-95 mx-auto"
          >
            <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] mr-4">
              Back to Log In
            </span>
            <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white">
              <ICONS.ToggleRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D6D6D6] flex items-center justify-center p-6 pt-safe pb-safe selection:bg-black/10">
      {/* Back to landing page */}
      <a
        href="https://tradeflowstudio.netlify.app"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors group"
      >
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Home
      </a>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-black/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md apple-glass rounded-[3rem] p-10 md:p-12 ambient-shadow relative overflow-hidden animate-reagle border-white/40">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-4 shadow-xl">
             <ICONS.Logo className="w-8 h-8 text-white" />
          </div>
          <span className="text-black/30 font-black tracking-[0.4em] text-[9px] uppercase">TradeFlow Journal</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tighter text-black leading-none mb-3">
            {isLogin ? 'Welcome Back' : 'Register'}
          </h1>
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-[9px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
          >
            {isLogin ? 'No account? Register now' : 'Already registered? Log in'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="full name"
                className="w-full bg-white/40 border border-white/60 rounded-2xl py-3.5 px-6 text-black placeholder:text-black/20 outline-none focus:bg-white focus:border-black/10 transition-all text-sm font-bold tracking-tight"
                required={!isLogin}
              />
            </div>
          )}

          <div className="relative">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e-mail address"
              className="w-full bg-white/40 border border-white/60 rounded-2xl py-3.5 px-6 text-black placeholder:text-black/20 outline-none focus:bg-white focus:border-black/10 transition-all text-sm font-bold tracking-tight"
              required
            />
          </div>

          <div className="relative">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="w-full bg-white/40 border border-white/60 rounded-2xl py-3.5 px-6 text-black placeholder:text-black/20 outline-none focus:bg-white focus:border-black/10 transition-all text-sm font-bold tracking-tight"
              required
            />
          </div>

          {/* Forgot password link */}
          {isLogin && (
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => { setIsForgotPassword(true); setResetEmail(email); setResetSent(false); setError(null); }}
                className="text-[9px] font-black uppercase tracking-widest text-black/30 hover:text-black transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 py-2.5 px-6 rounded-xl text-center">
              <p className="text-rose-600 text-[9px] font-black uppercase tracking-widest">{error}</p>
            </div>
          )}

          {/* T&C checkbox for signup */}
          {!isLogin && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    termsAccepted ? 'bg-black border-black' : 'border-black/25 bg-white/40 group-hover:border-black/50'
                  }`}
                  onClick={() => setTermsAccepted(!termsAccepted)}
                >
                  {termsAccepted && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-[10px] text-black/50 leading-relaxed font-medium" onClick={() => setTermsAccepted(!termsAccepted)}>
                  I agree to the{' '}
                  <button type="button" onClick={(e) => { e.stopPropagation(); setOpenLegal('terms'); }} className="text-black font-black underline decoration-black/30">Terms & Conditions</button>
                  {' '}and{' '}
                  <button type="button" onClick={(e) => { e.stopPropagation(); setOpenLegal('privacy'); }} className="text-black font-black underline decoration-black/30">Privacy Policy</button>
                </span>
              </label>
            </div>
          )}

          <div className="pt-4 flex justify-center">
            <button 
              type="submit" 
              disabled={isLoading}
              className="group flex items-center bg-black rounded-full p-1 pr-2 pl-6 hover:pr-4 transition-all duration-500 shadow-2xl active:scale-95 disabled:opacity-50"
            >
              <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] mr-4">
                {isLoading ? 'Processing...' : (isLogin ? 'Log in' : 'Sign up')}
              </span>
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
                <ICONS.ToggleRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </form>

        {/* Improved Quick Connect Section */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 w-full opacity-10">
            <div className="h-[1px] flex-1 bg-black"></div>
            <span className="text-[7px] font-black uppercase tracking-[0.4em]">External Link</span>
            <div className="h-[1px] flex-1 bg-black"></div>
          </div>
          
          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-12 h-12 bg-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 hover:-rotate-6 active:scale-95 transition-all duration-300 group border border-white/10"
            title="Sign in with Google"
          >
            {/* Minimalist Monochromatic White Google Logo */}
            <svg className="w-5 h-5 transition-all" viewBox="0 0 24 24" fill="white">
              <path d="M12.48 10.92v3.28h4.78c-.19 1.06-1.12 3.13-4.78 3.13-3.18 0-5.77-2.64-5.77-5.88s2.59-5.88 5.77-5.88c1.81 0 3.02.77 3.71 1.44l2.58-2.49c-1.66-1.55-3.82-2.49-6.29-2.49-5.26 0-9.52 4.26-9.52 9.52s4.26 9.52 9.52 9.52c5.5 0 9.15-3.87 9.15-9.3 0-.62-.07-1.1-.15-1.57h-9z"/>
            </svg>
          </button>
        </div>

        <div className="mt-10 pt-6 border-t border-black/5 text-center">
          <p className="text-[8px] text-black/30 font-semibold leading-relaxed max-w-xs mx-auto">
            ⚠️ Trading is risky and 99.9% of people lose money. This is not financial advice — do not risk money you cannot afford to lose. TradeFlow Journal is not responsible for any trading losses.
          </p>
          <p className="text-[7px] text-black/15 font-bold mt-2 uppercase tracking-widest">
            By continuing you agree to our{' '}
            <button onClick={() => setOpenLegal('terms')} className="text-black/30 underline cursor-pointer hover:text-black/50 transition-colors">Terms</button>
            {' '}&amp;{' '}
            <button onClick={() => setOpenLegal('privacy')} className="text-black/30 underline cursor-pointer hover:text-black/50 transition-colors">Privacy Policy</button>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotPassword && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-sm apple-glass rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-300 border border-white/40 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black tracking-tight text-black uppercase">Reset Password</h3>
              <button onClick={() => { setIsForgotPassword(false); setResetSent(false); setError(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-black/40 transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {resetSent ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm font-black text-black">Reset link sent!</p>
                <p className="text-[10px] font-bold text-black/40 leading-relaxed">Check <strong className="text-black">{resetEmail}</strong> for a password reset link. Check your spam folder if you don't see it.</p>
                <button onClick={() => { setIsForgotPassword(false); setResetSent(false); }} className="px-6 py-2.5 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest">Back to Login</button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-black/50 leading-relaxed">Enter your email and we'll send you a reset link.</p>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-white/40 border border-white/60 rounded-2xl py-3.5 px-5 text-black placeholder:text-black/20 outline-none focus:bg-white focus:border-black/10 transition-all text-sm font-bold"
                />
                {error && <p className="text-rose-600 text-[9px] font-black uppercase tracking-widest">{error}</p>}
                <button
                  onClick={handleForgotPassword}
                  disabled={resetLoading || !resetEmail.trim()}
                  className="w-full py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legal document modals */}
      {openLegal && <LegalModal doc={openLegal} onClose={() => setOpenLegal(null)} />}
    </div>
  );
};

export default Auth;