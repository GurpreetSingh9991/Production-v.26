import React from 'react';
import { 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  TrendingUp,
  Target,
  DollarSign,
  Award,
  Filter,
  Download,
  Upload,
  ExternalLink,
  Trash2,
  Edit,
  X,
  ChevronLeft,
  ChevronRight,
  LineChart,
  CalendarDays,
  Cloud,
  Settings,
  RefreshCw,
  Info,
  Clock,
  Activity,
  LogOut,
  BarChart3,
  Globe,
  Zap,
  LayoutDashboard,
  Plus,
  Quote,
  Eye,
  Mail,
  BrainCircuit,
  History,
  ScrollText,
  Sparkles
} from 'lucide-react';

export const COLORS = {
  WIN: '#10b981',
  LOSS: '#f43f5e',
  BE: '#94a3b8',
  PRIMARY: '#000000', 
  SECONDARY: '#1c1c1c',
  BG_LIGHT: '#D6D6D6',
  MISTAKES: {
    LOW: '#EAB308',
    MEDIUM: '#F59E0B',
    HIGH: '#F43F5E',
    CRITICAL: '#DC2626'
  }
};

export const SIDES = ['LONG', 'SHORT'] as const;
export const RESULTS = ['WIN', 'LOSS', 'BE'] as const;
export const GRADES = ['A+', 'A', 'B', 'C'] as const;
export const BIASES = ['UP', 'DOWN', 'SIDEWAYS'] as const;
export const SETUP_TYPES = ['A', 'B', 'C', 'D'] as const;
export const ASSET_TYPES = ['STOCKS', 'FOREX', 'FUTURES'] as const;

export const TRADER_QUOTES = [
  { text: "The goal of a successful trader is to make the best trades. Money is secondary.", author: "Alexander Elder" },
  { text: "I’m always thinking about losing money as opposed to making money. Don't focus on making money, focus on protecting what you have.", author: "Paul Tudor Jones" },
  { text: "The market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
  { text: "It's not whether you're right or wrong that's important, but how much money you make when you're right and how much you lose when you're wrong.", author: "George Soros" },
  { text: "Cutting losses is the most important rule of trading. If you can't take a small loss, sooner or later you will take the mother of all losses.", author: "Marty Schwartz" },
  { text: "The desire for constant action irrespective of underlying conditions is responsible for many losses on Wall Street.", author: "Jesse Livermore" },
  { text: "In this business, if you're good, you're right six times out of ten. You're never going to be right nine times out of ten.", author: "Peter Lynch" },
  { text: "A peak performance trader is totally committed to being the best and doing whatever it takes to be the best.", author: "Van K. Tharp" },
  { text: "Win or lose, everybody gets what they want out of the market. Some people seem to like to lose, so they win by losing money.", author: "Ed Seykota" },
  { text: "Trading is not about being right. It is about a process of identifying and managing probabilities.", author: "Mark Douglas" }
];

export const LogoIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="24" fill="black"/>
    <path 
      d="M30 65 L 50 45 L 70 65" 
      stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"
    />
    <path d="M50 45 L 70 25" stroke="white" strokeWidth="8" strokeLinecap="round" />
  </svg>
);

export const ICONS = {
  Dashboard: LayoutDashboard,
  Add: PlusCircle,
  Win: ArrowUpRight,
  Loss: ArrowDownRight,
  Neutral: Minus,
  Trending: TrendingUp,
  Target: Target,
  Dollar: DollarSign,
  Grade: Award,
  Filter: Filter,
  Export: Download,
  Download: Download,
  Import: Upload,
  Upload: Upload,
  External: ExternalLink,
  Delete: Trash2,
  Edit: Edit,
  Close: X,
  Logo: LogoIcon,
  ToggleLeft: ChevronLeft,
  ToggleRight: ChevronRight,
  ChevronRight: ChevronRight,
  ChevronLeft: ChevronLeft,
  Performance: LineChart,
  Journal: ScrollText,
  Insights: TrendingUp,
  Calendar: CalendarDays,
  Cloud: Cloud,
  Settings: Settings,
  Sync: RefreshCw,
  Info: Info,
  LineChart: LineChart,
  Clock: Clock,
  LogOut: LogOut,
  Stocks: BarChart3,
  Forex: Globe,
  Futures: Zap,
  Globe: Globe,
  Zap: Zap,
  Plus: Plus,
  Quote: Quote,
  Eye: Eye,
  Mail: Mail,
  Psychology: BrainCircuit,
  AIIntelligence: Sparkles
};