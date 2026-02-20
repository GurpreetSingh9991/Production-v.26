import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { getSupabaseClient, getSession } from '../services/supabase';
import { getTradeCountThisMonth } from '../services/planService';

interface ProfileSettingsProps {
  onClose: () => void;
  plan?: 'free' | 'pro';
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onClose, plan = 'free' }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<number>(0);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const session = await getSession();
      if (session?.user) {
        setFormData({
          fullName: session.user.user_metadata?.full_name || '',
          email: session.user.email || '',
          phone: session.user.user_metadata?.phone_number || '',
          avatarUrl: session.user.user_metadata?.avatar_url || ''
        });
        
        const count = await getTradeCountThisMonth(session.user.id);
        setUsage(count);
      }
    };
    fetchData();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { error: updateError } = await client.auth.updateUser({
        email: formData.email,
        data: {
          full_name: formData.fullName,
          phone_number: formData.phone,
          avatar_url: formData.avatarUrl
        }
      });

      if (updateError) throw updateError;
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadProject = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/download-project');
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || "Failed to download project zip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/40 backdrop-blur-md z-[150] flex items-center justify-center p-4 pt-safe pb-safe">
      <div className="apple-glass w-full max-w-xl rounded-[3rem] shadow-2xl border border-white relative ios-shadow animate-in zoom-in-95 fade-in duration-500 my-auto overflow-hidden">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white/30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden border border-white/20">
              <img 
                src={formData.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${formData.fullName}`} 
                className="w-full h-full object-cover" 
                alt="Avatar" 
              />
            </div>
            <div>
              <h2 className="text-lg font-black text-black tracking-tighter uppercase leading-none">Profile Access</h2>
              <p className="text-[8px] font-black text-black opacity-50 uppercase tracking-widest mt-1">Identity & Plan Control</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors text-black opacity-40 hover:opacity-100">
            <ICONS.Close className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 md:p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* Subscription Tier Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 bg-black rounded-full"></div>
              <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Service Tier</h3>
            </div>
            
            <div className={`p-6 rounded-[2rem] border transition-all ${plan === 'pro' ? 'bg-black text-white border-black shadow-xl' : 'bg-white/40 border-black/5'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className={`text-xl font-black tracking-tight flex items-center gap-2 ${plan === 'pro' ? 'text-white' : 'text-black'}`}>
                    {plan === 'pro' ? 'Studio Pro' : 'Free Terminal'}
                    {plan === 'pro' && <ICONS.Zap className="w-5 h-5 text-emerald-400" />}
                  </h4>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${plan === 'pro' ? 'text-white/40' : 'text-black/30'}`}>
                    Active Subscription
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${plan === 'pro' ? 'bg-white/10 text-white' : 'bg-black text-white'}`}>
                  {plan.toUpperCase()}
                </div>
              </div>
              
              <div className="space-y-3">
                 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className={plan === 'pro' ? 'text-white/40' : 'text-black/40'}>Usage Log</span>
                    <span className={plan === 'pro' ? 'text-emerald-400' : 'text-black'}>{usage} / {plan === 'pro' ? '∞' : '15'} Trades</span>
                 </div>
                 <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${plan === 'pro' ? 'bg-emerald-400' : usage >= 12 ? 'bg-rose-500' : 'bg-black'}`} 
                      style={{ width: `${plan === 'pro' ? 100 : (usage / 15) * 100}%` }} 
                    />
                 </div>
                 {plan === 'free' && (
                    <p className="text-[8px] font-bold text-black/30 italic">Upgrade for unlimited trades, AI narrative analysis, and advanced metrics.</p>
                 )}
              </div>
            </div>
          </section>

          {/* Developer Tools Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 bg-black rounded-full"></div>
              <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Developer Tools</h3>
            </div>
            
            <div className="p-6 rounded-[2rem] border bg-slate-50 border-black/5 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black tracking-tight text-black">Project Archive</h4>
                <p className="text-[8px] font-bold uppercase tracking-widest text-black/30 mt-1">Export full source code as .ZIP</p>
              </div>
              <button 
                type="button"
                onClick={handleDownloadProject}
                disabled={loading}
                className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <ICONS.Download className="w-5 h-5" />
              </button>
            </div>
          </section>

          {/* Identity Section */}
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 bg-black rounded-full"></div>
              <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">User Identification</h3>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-[2rem] bg-black/5 border border-black/10 overflow-hidden shadow-inner">
                  <img 
                    src={formData.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${formData.fullName}`} 
                    className="w-full h-full object-cover" 
                    alt="Current Avatar" 
                  />
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] cursor-pointer text-white text-[8px] font-black uppercase tracking-widest">
                  Change
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="block text-[8px] font-black text-black uppercase tracking-widest ml-2">Full Name</label>
                <input 
                  type="text" 
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Trader Name"
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-[13px] text-black focus:border-black outline-none transition-all font-bold shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[8px] font-black text-black uppercase tracking-widest ml-2">E-mail address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@flow.com"
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-[13px] text-black focus:border-black outline-none transition-all font-bold shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[8px] font-black text-black uppercase tracking-widest ml-2">Phone Number</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (000) 000-0000"
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-[13px] text-black focus:border-black outline-none transition-all font-bold shadow-sm"
                />
              </div>
            </div>
          </form>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 py-3 px-6 rounded-2xl text-center">
              <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 py-3 px-6 rounded-2xl text-center">
              <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Update Successful</p>
            </div>
          )}

          {/* Footer Info */}
          <div className="flex items-center justify-between text-[8px] font-black text-black opacity-20 uppercase tracking-[0.3em] pt-4">
            <span>Identity Protocol SEC-7</span>
            <span>Studio Build v1.08</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <button onClick={onClose} className="flex-1 py-4 rounded-full text-black opacity-40 font-black text-[10px] uppercase tracking-widest hover:opacity-100 transition-all">Abort</button>
          <button 
            onClick={handleUpdate}
            disabled={loading}
            className="
              flex-1 py-4 rounded-full 
              bg-black text-white
              font-black text-[11px] uppercase tracking-[0.3em]
              shadow-2xl transition-all duration-300 hover:brightness-110 active:scale-95 disabled:opacity-50
            "
          >
            {loading ? 'Synchronizing...' : 'Apply Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;