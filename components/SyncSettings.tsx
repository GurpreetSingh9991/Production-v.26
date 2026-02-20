import React, { useState, useEffect, useRef } from 'react';
import { SyncConfig, PerformanceUnit } from '../types';
import { ICONS as UI_ICONS } from '../constants';
import { SupabaseConfig, deleteUserAccountData } from '../services/supabase';

interface SyncSettingsProps {
  config: SyncConfig;
  onSave: (config: SyncConfig, sbConfig?: SupabaseConfig) => void;
  onClose: () => void;
  onExportCSV: () => void;
  onExternalSync: () => void;
  onCloudRefresh: () => void;
  isSyncing: boolean;
  isCloudSyncing: boolean;
  hasSession: boolean;
  displayUnit: PerformanceUnit;
  setDisplayUnit: (unit: PerformanceUnit) => void;
  userPlan: 'free' | 'pro';
  onImportCSV: (csvText: string) => void;
  activeAccountId: string;
}

const SyncSettings: React.FC<SyncSettingsProps> = ({ 
  config, 
  onSave, 
  onClose,
  onExportCSV,
  onExternalSync,
  onCloudRefresh,
  isSyncing,
  isCloudSyncing,
  hasSession,
  displayUnit,
  setDisplayUnit,
  userPlan,
  onImportCSV,
  activeAccountId
}) => {
  const [url, setUrl] = useState(config.sheetUrl);
  const [localUnit, setLocalUnit] = useState<PerformanceUnit>(displayUnit);
  const [isDeleting, setIsDeleting] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState('');
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVED'>('IDLE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalUnit(displayUnit);
  }, [displayUnit]);

  const isDirty = url !== config.sheetUrl || localUnit !== displayUnit;

  const handleSave = () => {
    if (url && !url.includes('docs.google.com/spreadsheets')) {
      alert('Please enter a valid Google Sheets URL');
      return;
    }
    
    setDisplayUnit(localUnit);
    onSave({
      ...config,
      sheetUrl: url
    });
    
    setSaveStatus('SAVED');
    setTimeout(() => setSaveStatus('IDLE'), 2000);
  };

  const handleDeleteAccount = async () => {
    if (wipeConfirm !== 'WIPE') {
      alert("Type 'WIPE' to confirm account deletion.");
      return;
    }
    
    setIsDeleting(true);
    const success = await deleteUserAccountData();
    if (success) {
      window.location.reload();
    } else {
      alert("Account wipe failed. Please check your connection.");
      setIsDeleting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) onImportCSV(text);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const metricOptions: { unit: PerformanceUnit; label: string }[] = [
    { unit: 'CURRENCY', label: 'Cash' },
    { unit: 'PERCENT', label: 'Return' },
    { unit: 'R_MULTIPLE', label: 'Risk' },
    { unit: 'TICKS', label: 'Price' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#EFEFEF] animate-in fade-in duration-500 font-sans relative">
      
      {/* 3-Zone Fixed Glass Header (Mobile Specific) - z-index: 100 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[100] frosted-glass-header h-[calc(56px+var(--sat))] pt-safe px-4 flex items-center justify-between">
        <button 
          onClick={onClose} 
          className="w-[44px] h-[44px] flex items-center justify-center -ml-2 text-[#111111] active:scale-90 transition-all"
        >
          <UI_ICONS.ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center text-center">
          <h2 className="text-[15px] font-black text-[#111111] tracking-[0.15em] uppercase leading-none">Settings</h2>
          <p className="text-[10px] font-bold text-[#999999] uppercase tracking-[0.08em] mt-1">General Management</p>
        </div>
        <div className="w-[44px] h-[44px] flex items-center justify-center -mr-2 text-[#111111]/10">
          <UI_ICONS.Info className="w-5 h-5" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-nav-safe pt-[calc(56px+var(--sat)+16px)] lg:pt-0 lg:pb-10 will-change-transform">
        <div className="max-w-[780px] mx-auto p-4 sm:p-0">
          
          <div className="hidden lg:flex py-8 items-center gap-4">
            <button onClick={onClose} className="p-2 -ml-2 text-[#888888] hover:text-[#111111] transition-colors active:scale-90">
              <UI_ICONS.ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-sm font-black text-[#111111] tracking-[0.2em] uppercase leading-none">Settings</h2>
              <p className="text-[10px] font-bold text-[#888888] uppercase tracking-[0.1em] mt-1">General Management</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* SECTION 1: Display Perspective */}
            <section className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6 border-none">
              <div className="flex items-center gap-2 mb-6 text-[#555555]">
                <UI_ICONS.Eye className="w-4 h-4" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888888]">Display Perspective</h3>
              </div>
              
              <div className="flex p-1 bg-[#F5F5F5] rounded-full border border-[#E5E5E5]">
                {metricOptions.map((opt) => (
                  <button
                    key={opt.unit}
                    onClick={() => setLocalUnit(opt.unit)}
                    className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] rounded-full transition-all duration-200 ${
                      localUnit === opt.unit 
                        ? 'bg-[#111111] text-white shadow-md' 
                        : 'text-[#888888] hover:text-[#111111]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* SECTION 2: Account & Plan */}
            <section className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] border-none overflow-hidden">
              <div className="px-6 pt-6 flex items-center gap-2 text-[#555555]">
                <UI_ICONS.Settings className="w-4 h-4" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888888]">Account & Plan</h3>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F0F0]">
                  <div className="text-left min-w-0 flex-1">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.1em] text-[#111111] leading-none mb-1">Current Plan</h4>
                  </div>
                  {userPlan === 'pro' ? (
                    <span className="px-2 py-0.5 bg-black text-white text-[8px] font-black rounded-full ml-2">PRO</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-black/10 text-black/40 text-[8px] font-black rounded-full ml-2">FREE</span>
                  )}
                </div>
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F0F0]">
                  <div className="text-left min-w-0 flex-1">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.1em] text-[#111111] leading-none mb-1">Upgrade to Pro</h4>
                    <p className="text-[8px] font-bold text-[#888888] uppercase tracking-tight truncate w-full">
                      UNLOCK AI, ANALYTICS, PSYCHOLOGY & IMPORT
                    </p>
                  </div>
                  {userPlan === 'pro' ? (
                    <span className="text-[11px] font-black text-emerald-500 ml-2">✓ Active</span>
                  ) : (
                    <button 
                      onClick={() => window.open('https://tradeflow-app.netlify.app', '_self')}
                      className="px-4 py-1.5 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-widest ml-2"
                    >
                      Upgrade →
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* SECTION 3: Data & Sync */}
            <section className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] border-none overflow-hidden">
              <div className="px-6 pt-6 flex items-center gap-2 text-[#555555]">
                <UI_ICONS.Sync className="w-4 h-4" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888888]">Data & Sync</h3>
              </div>
              
              <div className="mt-4">
                {hasSession && (
                  <SettingRow 
                    icon={<UI_ICONS.Cloud className="w-4 h-4" />} 
                    label="Refresh Cloud Data" 
                    description="FORCE SYNC WITH SUPABASE MASTER RECORDS"
                    onClick={onCloudRefresh}
                    loading={isCloudSyncing}
                  />
                )}
                
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <SettingRow 
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>} 
                  label="Import Trades (CSV)" 
                  description="SUPPORT FOR MT5, IBKR, THINKORSWIM, & TRADEZELLA"
                  onClick={() => {
                    if (userPlan === 'pro') {
                      fileInputRef.current?.click();
                    } else {
                      alert("Upgrade to Pro to import trades from other platforms.");
                    }
                  }}
                  badge={userPlan === 'pro' ? <span className="px-2 py-0.5 bg-black text-white text-[8px] font-black rounded-full ml-2">PRO</span> : <span className="px-2 py-0.5 bg-black/10 text-black/40 text-[8px] font-black rounded-full ml-2">PRO</span>}
                />

                <SettingRow 
                  icon={<UI_ICONS.Export className="w-4 h-4" />} 
                  label="Export Trade Log" 
                  description="DOWNLOAD YOUR TRADES AS .CSV FILE"
                  onClick={onExportCSV}
                  isLast={false}
                />

                <SettingRow 
                  icon={<UI_ICONS.Calendar className="w-4 h-4" />} 
                  label="Sync Google Sheet" 
                  description="PULL TRADES FROM LINKED GOOGLE SPREADSHEET"
                  onClick={() => {
                    if (userPlan === 'pro') {
                      onExternalSync();
                    } else {
                      alert("Upgrade to Pro to sync with Google Sheets.");
                    }
                  }}
                  loading={isSyncing}
                  badge={userPlan === 'pro' ? <span className="px-2 py-0.5 bg-black text-white text-[8px] font-black rounded-full ml-2">PRO</span> : <span className="px-2 py-0.5 bg-black/10 text-black/40 text-[8px] font-black rounded-full ml-2">PRO</span>}
                  isLast={true}
                />
              </div>
            </section>

            {/* SECTION 4: Integration */}
            <section className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6 border-none">
              <div className="flex items-center gap-2 mb-6 text-[#555555]">
                <UI_ICONS.Globe className="w-4 h-4" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888888]">Integration</h3>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="url" 
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="GOOGLE SHEETS URL"
                  className="flex-1 bg-white border border-[#E5E5E5] rounded-xl p-4 text-[11px] font-mono text-[#111111] focus:ring-1 focus:ring-[#111111] outline-none transition-all placeholder:text-[#BBBBBB]"
                />
                <button 
                  onClick={handleSave}
                  className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm min-w-[120px] ${isDirty ? 'bg-[#111111] text-white' : 'bg-[#E5E5E5] text-[#888888]'}`}
                >
                  Commit
                </button>
              </div>
              <p className="text-[10px] text-black/30 mt-2">
                Share your sheet to 'Anyone with the link can view' for sync to work.
              </p>
            </section>

            {/* SECTION 5: Support */}
            <section className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] border-none overflow-hidden">
              <div className="px-6 pt-6 flex items-center gap-2 text-[#555555]">
                <UI_ICONS.Info className="w-4 h-4" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888888]">Support</h3>
              </div>
              <div className="mt-4">
                <SettingRow 
                  icon={<UI_ICONS.Mail className="w-4 h-4" />} 
                  label="Email Support" 
                  description="support@tradeflowstudio.com"
                  onClick={() => window.location.href = 'mailto:support@tradeflowstudio.com'}
                />
                <SettingRow 
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} 
                  label="Privacy Policy" 
                  description="VIEW OUR DATA & PRIVACY TERMS"
                  onClick={() => window.open('#', '_blank')}
                />
                <SettingRow 
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>} 
                  label="Terms of Service" 
                  description="VIEW TERMS & CONDITIONS"
                  onClick={() => window.open('#', '_blank')}
                  isLast={true}
                />
              </div>
            </section>

            {/* SECTION 6: Danger Zone */}
            <section className="bg-[#FFF5F5] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6 border border-[#FFCCCC]">
              <div className="flex items-center gap-2 mb-6 text-[#CC0000]">
                <UI_ICONS.LogOut className="w-4 h-4" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Account Hub</h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-[10px] text-[#CC0000] font-bold uppercase tracking-widest leading-relaxed opacity-70">
                  Terminating your session will wipe all cloud journal entries.
                </p>
                <div className="space-y-3">
                  <input 
                    type="text"
                    value={wipeConfirm}
                    onChange={(e) => setWipeConfirm(e.target.value)}
                    placeholder="TYPE 'WIPE' TO PROCEED"
                    className="w-full bg-white border border-[#FFCCCC] rounded-xl p-4 text-[11px] font-black uppercase tracking-widest outline-none focus:border-[#CC0000] transition-colors placeholder:text-[#FFCCCC]"
                  />
                  <button 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || wipeConfirm !== 'WIPE'}
                    className="w-full h-[48px] rounded-full bg-white border border-[#FFCCCC] text-[#CC0000] text-[10px] font-black uppercase tracking-widest active:bg-[#CC0000] active:text-white disabled:opacity-30 transition-all flex items-center justify-center"
                  >
                    {isDeleting ? 'Wiping Terminal...' : 'Wipe All Cloud Data'}
                  </button>
                </div>
              </div>
            </section>

            <div className="py-12 flex justify-center">
              <button 
                onClick={handleSave}
                disabled={!isDirty && saveStatus === 'IDLE'}
                className={`h-[48px] px-10 rounded-full text-[13px] font-black uppercase tracking-[0.15em] shadow-xl transition-all duration-300 flex items-center justify-center min-w-[180px] whitespace-nowrap ${
                  saveStatus === 'SAVED' 
                    ? 'bg-emerald-500 text-white' 
                    : isDirty 
                      ? 'bg-[#111111] text-white hover:scale-105 active:scale-95' 
                      : 'bg-[#E5E5E5] text-[#888888] cursor-not-allowed opacity-50'
                }`}
              >
                {saveStatus === 'SAVED' ? 'SAVED ✓' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
  isLast?: boolean;
  badge?: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ icon, label, description, onClick, loading, isLast, badge }) => (
  <button 
    onClick={onClick}
    disabled={loading}
    className={`flex items-center justify-between w-full px-6 py-5 bg-white hover:bg-[#FAFAFA] transition-colors group active:bg-[#F0F0F0] disabled:opacity-50 ${isLast ? '' : 'border-b border-[#F0F0F0]'}`}
  >
    <div className="flex items-center gap-4 min-w-0 flex-1">
      <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[#555555] group-hover:text-[#111111] transition-colors shrink-0">
        {loading ? <UI_ICONS.Sync className="w-4 h-4 animate-spin" /> : icon}
      </div>
      <div className="text-left min-w-0 flex-1 flex items-center">
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.1em] text-[#111111] leading-none mb-1 flex items-center">
            {label}
            {badge}
          </h4>
          <p className="text-[8px] font-bold text-[#888888] uppercase tracking-tight truncate w-full">
            {description}
          </p>
        </div>
      </div>
    </div>
    <UI_ICONS.ChevronRight className="w-4 h-4 text-[#DDDDDD] group-hover:text-[#111111] transition-all transform group-hover:translate-x-1 shrink-0 ml-4" />
  </button>
);

export default SyncSettings;
