export type Side = 'LONG' | 'SHORT';
export type Result = 'WIN' | 'LOSS' | 'BE';
export type Grade = 'A+' | 'A' | 'B' | 'C';
export type Bias = 'UP' | 'DOWN' | 'SIDEWAYS';
export type SetupType = 'A' | 'B' | 'C' | 'D';
export type AssetType = 'STOCKS' | 'FOREX' | 'FUTURES';

export type PerformanceUnit = 'CURRENCY' | 'PERCENT' | 'R_MULTIPLE' | 'TICKS';

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  currency: string;
  color: string;
  createdAt: string;
}

export interface Execution {
  id: string;
  price: number;
  qty: number;
  fees: number;
  time: string;
  type: 'ENTRY' | 'EXIT';
}

export interface Mistake {
  category: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedCost?: number;
  description: string;
  lessonLearned: string;
  type?: string; // Legacy support
  lesson?: string; // Legacy support
}

export interface Psychology {
  moodBefore?: number;
  moodAfter?: number;
  states?: string[];
  notes?: string;
}

export interface Trade {
  id: string;
  accountId: string; 
  timestamp: string;
  date: string;
  symbol: string;
  side: Side;
  assetType: AssetType;
  qty: number;
  multiplier: number;
  entryPrice: number;
  exitPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  entryTime: string;
  exitTime: string;
  duration: string;
  pnl: number;
  rr: number;
  result: Result;
  resultGrade: Grade;
  setupType: string;
  weeklyBias: Bias;
  narrative: string;
  chartLink: string;
  imageUrl?: string; 
  tags?: string[];
  
  // Behavioral Tracking
  followedPlan?: boolean;
  plan?: string;

  // Advanced Tracking
  executions?: Execution[];
  average_entry?: number;
  average_exit?: number;
  total_fees?: number;
  gross_pnl?: number;
  net_pnl?: number;

  // Additional fields from DB Schema
  ticket?: string;
  commission?: number;
  swap?: number;
  pips?: number;
  
  // Optional
  images?: string[];
  mistakes?: Mistake[];
  psychology?: Psychology;
}

export interface SyncConfig {
  sheetUrl: string;
  lastSynced: string | null;
  autoSync: boolean;
}

export type ViewType = 'DASHBOARD' | 'TRADES_LOG' | 'CALENDAR' | 'ANALYTICS' | 'PSYCHOLOGY' | 'AI_INTELLIGENCE' | 'SETTINGS';