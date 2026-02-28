import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { Trade, Side, Result, Grade, Bias, AssetType, Account } from '../types';

const HARDCODED_URL = 'https://aahisjhakwviqbcwsmkt.supabase.co';
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaGlzamhha3d2aXFiY3dzbWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTM5NDgsImV4cCI6MjA4NjIyOTk0OH0.FnNEUVaGzjkLuQ1gOSzrnpZE-6vEAq4tucBLnHUzUGA';

export interface SupabaseConfig {
  url: string;
  key: string;
}

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (clientInstance) return clientInstance;
  
  const storedUrl = localStorage.getItem('tf_sb_url');
  const storedKey = localStorage.getItem('tf_sb_key');
  
  const url = (storedUrl && storedUrl !== 'undefined' && storedUrl !== 'null') ? storedUrl : HARDCODED_URL;
  const key = (storedKey && storedKey !== 'undefined' && storedKey !== 'null') ? storedKey : HARDCODED_KEY;

  if (url && key && url.startsWith('http')) {
    try {
      clientInstance = createClient(url, key);
      return clientInstance;
    } catch (e) {
      console.error("Supabase Initialization Failed", e);
      return null;
    }
  }
  return null;
};

export const clearAuthSession = () => {
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('auth-token')) {
      localStorage.removeItem(key);
    }
  });
};

export const getSupabaseAccounts = async (): Promise<Account[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;
  
  // ✅ FIX: Get current user to filter accounts
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    console.warn('No authenticated user for getSupabaseAccounts');
    throw new Error('AUTH_ERROR');
  }
  
  const { data, error } = await client
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)  // ✅ CRITICAL: Only fetch user's own accounts
    .order('created_at', { ascending: true });

  if (error) {
    if (error.message.toLowerCase().includes('jwt') || error.message.toLowerCase().includes('token')) {
      throw new Error('AUTH_ERROR');
    }
    console.error("Supabase Account Fetch Error:", error.message);
    return null;
  }
  
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    initialBalance: parseFloat(row.initial_balance),
    currency: row.currency,
    color: row.color,
    createdAt: row.created_at
  }));
};

export const deleteSupabaseAccount = async (id: string): Promise<{success: boolean, count: number, error?: any}> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, count: 0, error: { message: 'Supabase client not initialized' } };
  
  console.log("Supabase: Requesting delete for account ID:", id);

  // We use .select() because 'count' on delete can be unreliable depending on Postgres configuration/RLS
  const { data, error } = await client
    .from('accounts')
    .delete()
    .eq('id', id)
    .select();

  if (error) {
    console.error("Supabase: Deletion failed with error:", error);
    return { success: false, count: 0, error };
  }
  
  const deletedCount = data ? data.length : 0;
  console.log(`Supabase: Delete operation finished. Rows returned by select: ${deletedCount}`);
  
  return { success: true, count: deletedCount };
};

export const syncAccountsToSupabase = async (accounts: Account[]): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;
  
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;

  const rows = accounts.map(acc => ({
    id: acc.id,
    user_id: user.id,
    name: acc.name,
    initial_balance: acc.initialBalance,
    currency: acc.currency,
    color: acc.color,
    created_at: acc.createdAt
  }));

  const { error } = await client
    .from('accounts')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error("Supabase Account Sync Failed:", error.message);
    return false;
  }
  return true;
};

export const signUp = async (email: string, password: string, name?: string, phone?: string) => {
  const client = getSupabaseClient();
  if (!client) throw new Error("Backend infrastructure offline.");
  return await client.auth.signUp({ 
    email, 
    password,
    options: { data: { full_name: name, phone_number: phone } }
  });
};

export const signIn = async (email: string, password: string) => {
  const client = getSupabaseClient();
  if (!client) throw new Error("Backend infrastructure offline.");
  return await client.auth.signInWithPassword({ email, password });
};

export const signInWithGoogle = async () => {
  const client = getSupabaseClient();
  if (!client) throw new Error("Backend infrastructure offline.");
  return await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
};

export const signOut = async () => {
  const client = getSupabaseClient();
  if (!client) return;
  return await client.auth.signOut();
};

export const getSession = async (): Promise<Session | null> => {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session;
};

const mapFromDb = (row: any): Trade => {
  const defaultPsychology = { moodBefore: 3, moodAfter: 3, states: [], notes: '' };
  const psychology = row.psychology && typeof row.psychology === 'object' 
    ? { ...defaultPsychology, ...row.psychology }
    : defaultPsychology;

  return {
    id: row.id,
    accountId: row.account_id || 'ALL',
    timestamp: row.timestamp,
    date: row.date,
    symbol: row.symbol,
    side: row.side as Side,
    assetType: (row.asset_type as AssetType) || 'STOCKS',
    qty: parseFloat(row.qty || 0),
    multiplier: parseFloat(row.multiplier || 1),
    entryPrice: parseFloat(row.entry_price || 0),
    exitPrice: parseFloat(row.exit_price || 0),
    stopLossPrice: parseFloat(row.stop_loss_price || 0),
    targetPrice: parseFloat(row.target_price || 0),
    entryTime: row.entry_time,
    exitTime: row.exit_time,
    duration: row.duration,
    pnl: parseFloat(row.pnl || 0),
    rr: parseFloat(row.rr || 0),
    result: row.result as Result,
    resultGrade: row.result_grade as Grade,
    setupType: row.setup_type,
    weeklyBias: row.weekly_bias as Bias,
    narrative: row.narrative,
    chartLink: row.chart_link,
    imageUrl: row.image_url,
    tags: row.tags || [],
    followedPlan: row.followed_plan,
    plan: row.plan,
    executions: row.executions || [],
    images: row.images || [],
    mistakes: row.mistakes || [],
    psychology: psychology,
    ticket: row.ticket,
    commission: row.commission ? parseFloat(row.commission) : undefined,
    swap: row.swap ? parseFloat(row.swap) : undefined,
    pips: row.pips ? parseFloat(row.pips) : undefined,
    average_entry: row.average_entry ? parseFloat(row.average_entry) : undefined,
    average_exit: row.average_exit ? parseFloat(row.average_exit) : undefined,
    total_fees: row.total_fees ? parseFloat(row.total_fees) : 0,
    gross_pnl: row.gross_pnl ? parseFloat(row.gross_pnl) : undefined,
    net_pnl: row.net_pnl ? parseFloat(row.net_pnl) : undefined
  } as Trade;
};

const mapToDb = (trade: Trade, userId: string) => ({
  id: trade.id,
  user_id: userId,
  account_id: trade.accountId === 'ALL' || !trade.accountId ? null : trade.accountId,
  timestamp: trade.timestamp,
  date: trade.date,
  symbol: trade.symbol,
  side: trade.side,
  asset_type: trade.assetType,
  qty: trade.qty,
  multiplier: trade.multiplier,
  entry_price: trade.entryPrice,
  exit_price: trade.exitPrice,
  stop_loss_price: trade.stopLossPrice,
  target_price: trade.targetPrice,
  entry_time: trade.entryTime,
  exit_time: trade.exitTime,
  duration: trade.duration,
  pnl: trade.pnl,
  rr: trade.rr || 0,
  result: trade.result,
  result_grade: trade.resultGrade,
  setup_type: trade.setupType,
  weekly_bias: trade.weeklyBias,
  narrative: trade.narrative,
  chart_link: trade.chartLink,
  image_url: trade.imageUrl,
  tags: trade.tags || [],
  followed_plan: trade.followedPlan,
  plan: trade.plan,
  executions: trade.executions || [],
  images: trade.images || [],
  mistakes: trade.mistakes || [],
  psychology: trade.psychology || { moodBefore: 3, moodAfter: 3, states: [], notes: '' },
  ticket: trade.ticket,
  commission: trade.commission,
  swap: trade.swap,
  pips: trade.pips,
  average_entry: trade.average_entry,
  average_exit: trade.average_exit,
  total_fees: trade.total_fees || 0,
  gross_pnl: trade.gross_pnl,
  net_pnl: trade.net_pnl
});

export const getSupabaseTrades = async (): Promise<Trade[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;
  
  // ✅ FIX: Get current user to filter trades
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    console.warn('No authenticated user for getSupabaseTrades');
    throw new Error('AUTH_ERROR');
  }
  
  console.log('📊 Fetching trades for user:', user.id);
  
  // ✅ FIX: Filter by user_id to only get THIS user's trades
  const { data, error } = await client
    .from('trades')
    .select('*')
    .eq('user_id', user.id)  // ✅ CRITICAL: Only fetch user's own trades
    .is('deleted_at', null)   // ✅ Exclude soft-deleted trades
    .order('date', { ascending: false });

  if (error) {
    if (error.message.toLowerCase().includes('jwt') || error.message.toLowerCase().includes('token')) {
      throw new Error('AUTH_ERROR');
    }
    console.error("Supabase Fetch Error:", error.message);
    return null;
  }
  
  console.log(`✅ Fetched ${data?.length || 0} trades`);
  return (data || []).map(mapFromDb);
};

export const deleteSupabaseTrade = async (id: string): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;
  
  const { error } = await client
    .from('trades')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Deletion Error:", error.message);
    return false;
  }
  return true;
};

export const syncSingleTradeToSupabase = async (trade: Trade): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;
  
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;

  const row = mapToDb(trade, user.id);
  const { error } = await client
    .from('trades')
    .upsert(row, { onConflict: 'id' });

  if (error) {
    console.error("Single Trade Sync Failed:", error.message, error.details);
    return false;
  }
  return true;
};

export const syncTradesToSupabase = async (trades: Trade[]): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client || trades.length === 0) return false;
  
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;

  const rows = trades.map(t => mapToDb(t, user.id));

  const { error } = await client
    .from('trades')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error("Supabase Bulk Sync Failed:", error.message, error.details);
    return false;
  }
  return true;
};

export const deleteUserAccountData = async (): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      console.warn("Wipe requested but user session invalid. Clearing local only.");
      localStorage.removeItem('precision_trader_journal_data');
      localStorage.removeItem('tf_accounts');
      clearAuthSession();
      return true;
    }
    
    // Cleanup Cloud Assets
    const { data: files } = await client.storage.from('trade-images').list(user.id);
    if (files && files.length > 0) {
      const paths = files.map(f => `${user.id}/${f.name}`);
      await client.storage.from('trade-images').remove(paths);
    }

    // Explicit Deletions
    await client.from('trades').delete().eq('user_id', user.id);
    await client.from('accounts').delete().eq('user_id', user.id);
    
    // Local Wipe
    localStorage.removeItem('precision_trader_journal_data');
    localStorage.removeItem('tf_accounts');
    
    await client.auth.signOut();
    clearAuthSession();
    return true;
  } catch (error) {
    console.error("Critical Account Wipe Error:", error);
    localStorage.removeItem('precision_trader_journal_data');
    localStorage.removeItem('tf_accounts');
    clearAuthSession();
    return false;
  }
};

export const initSupabase = (config: SupabaseConfig) => {
  if (!config.url || !config.key) return null;
  clientInstance = createClient(config.url, config.key);
  return clientInstance;
};