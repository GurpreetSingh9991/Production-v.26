import React, { useMemo, useState, useEffect } from 'react';
import { Trade } from '../types';

interface Props { trades: Trade[]; userName: string; }

// ── XP & Level System ─────────────────────────────────────────────────────────
const LEVELS = [
  { name: 'Recruit',      minXP: 0,     color: '#8896a8', accent: 'rgba(136,150,168,0.12)' },
  { name: 'Apprentice',   minXP: 200,   color: '#6c83f5', accent: 'rgba(108,131,245,0.12)' },
  { name: 'Trader',       minXP: 500,   color: '#4a9eff', accent: 'rgba(74,158,255,0.12)'  },
  { name: 'Analyst',      minXP: 1000,  color: '#34d399', accent: 'rgba(52,211,153,0.12)'  },
  { name: 'Strategist',   minXP: 2000,  color: '#f6c547', accent: 'rgba(246,197,71,0.12)'  },
  { name: 'Professional', minXP: 4000,  color: '#fb923c', accent: 'rgba(251,146,60,0.12)'  },
  { name: 'Expert',       minXP: 8000,  color: '#f87171', accent: 'rgba(248,113,113,0.12)' },
  { name: 'Master',       minXP: 16000, color: '#c084fc', accent: 'rgba(192,132,252,0.14)' },
  { name: 'Legend',       minXP: 32000, color: '#fbbf24', accent: 'rgba(251,191,36,0.16)'  },
];

const calcXP = (trades: Trade[]) => {
  let xp = 0;
  trades.forEach(t => {
    xp += 10;
    if (t.pnl > 0) xp += 5;
    if (t.followedPlan === true) xp += 4;
    if (t.grade === 'A+') xp += 10;
    else if (t.grade === 'A') xp += 6;
    else if (t.grade === 'B') xp += 3;
    if (t.narrative?.trim().length > 20) xp += 3;
    if (t.tags?.length > 0) xp += 1;
    if (t.psychology?.states?.length > 0) xp += 2;
  });
  return xp;
};

const getLevel = (xp: number) => {
  let lvl = LEVELS[0]; let idx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) { lvl = LEVELS[i]; idx = i; break; }
  }
  const next = LEVELS[idx + 1] || null;
  const progress = next ? ((xp - lvl.minXP) / (next.minXP - lvl.minXP)) * 100 : 100;
  return { level: lvl, index: idx, next, progress: Math.min(progress, 100) };
};

const calcStreaks = (trades: Trade[]) => {
  if (!trades.length) return { current: 0, best: 0, currentWin: 0, bestWin: 0, activeDays: 0 };
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  const days = [...new Set(sorted.map(t => t.date))].sort();
  let cur = 1, best = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i]+'T12:00:00').getTime() - new Date(days[i-1]+'T12:00:00').getTime()) / 86400000;
    if (diff <= 1) { cur++; if (cur > best) best = cur; } else cur = 1;
  }
  const gapDays = (new Date(new Date().toISOString().split('T')[0]+'T12:00:00').getTime() - new Date(days[days.length-1]+'T12:00:00').getTime()) / 86400000;
  const currentStreak = gapDays <= 1 ? cur : 0;
  const byResult = sorted.map(t => t.pnl > 0);
  let wCur = 0, wBest = 0, wRun = 0;
  byResult.forEach(w => { if (w) { wRun++; if (wRun > wBest) wBest = wRun; } else wRun = 0; });
  for (let i = byResult.length - 1; i >= 0; i--) { if (byResult[i]) wCur++; else break; }
  return { current: currentStreak, best, currentWin: wCur, bestWin: wBest, activeDays: days.length };
};

// ── SVG Icon Library — Apple SF Symbols aesthetic ─────────────────────────────
// Each icon is a clean SVG path, 24x24 viewBox, strokeWidth 1.6, no emoji
const AchievementIcons: Record<string, React.FC<{color:string; size?:number}>> = {
  first_trade: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      <path d="M8 12h8M12 8v8" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  hat_trick: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 21h14M12 3l1.5 4.5h4.5l-3.5 2.5 1.5 4.5L12 12l-4 2.5 1.5-4.5L6 7.5h4.5L12 3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  journaler: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="12" height="16" rx="2" stroke={color} strokeWidth="1.5"/>
      <path d="M8 7h6M8 11h6M8 15h3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16 7l4 4-4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  discipline: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ten_trades: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="12" width="3" height="9" rx="1" stroke={color} strokeWidth="1.4"/>
      <rect x="8" y="8" width="3" height="13" rx="1" stroke={color} strokeWidth="1.4"/>
      <rect x="13" y="4" width="3" height="17" rx="1" stroke={color} strokeWidth="1.4"/>
      <rect x="18" y="6" width="3" height="15" rx="1" stroke={color} strokeWidth="1.4"/>
    </svg>
  ),
  fifty_trades: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="1.5" fill={color}/>
    </svg>
  ),
  century: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  five_hundred: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  win_rate_50: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2v20M2 12h20" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.3"/>
      <path d="M6 16l3-4 3 3 4-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  win_rate_65: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 17l4-5 4 3 5-7 5 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="20" cy="6" r="2.5" stroke={color} strokeWidth="1.4"/>
    </svg>
  ),
  win_rate_75: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 21c5 0 9-4 9-9s-4-9-9-9-9 4-9 9 4 9 9 9z" stroke={color} strokeWidth="1.4"/>
      <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0"/>
      <path d="M9 12.5l2 2 4-4.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="4" r="1.5" fill={color}/>
    </svg>
  ),
  a_game: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 20l6-16 6 16M8.5 14h7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="19" cy="5" r="2" fill={color} opacity="0.9"/>
    </svg>
  ),
  diversified: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.4"/>
      <ellipse cx="12" cy="12" rx="4" ry="9" stroke={color} strokeWidth="1.2"/>
      <path d="M3 12h18" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  streak_7: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8.5 21c0-4 3.5-6 3.5-10a4 4 0 00-8 0c0 2.5 1.5 4 1.5 4s-1-1.5-1-3a2 2 0 014 0c0 3.5-3.5 5.5-3.5 9h12c0-3.5-3.5-5.5-3.5-9a2 2 0 014 0c0 1.5-1 3-1 3s1.5-1.5 1.5-4a4 4 0 00-8 0c0 4 3.5 6 3.5 10H8.5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  streak_30: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2c-3 5-5 7-5 11a5 5 0 0010 0c0-4-2-6-5-11z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 16c0-2 1-3 2-4" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
    </svg>
  ),
  risk_manager: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L4 6.5v5.5c0 4.5 3.5 8.7 8 9.7 4.5-1 8-5.2 8-9.7V6.5L12 3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  self_aware: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.5"/>
      <path d="M6 20v-1a6 6 0 0112 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="18" cy="8" r="2" stroke={color} strokeWidth="1.3" opacity="0.5"/>
    </svg>
  ),
  green_month: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="2.5" stroke={color} strokeWidth="1.5"/>
      <path d="M3 9h18M8 2v4M16 2v4" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M8 14l2.5 2.5L16 13" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  win_streak_5: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 20V8l8-5 8 5v12" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="9" y="14" width="6" height="6" rx="1" stroke={color} strokeWidth="1.3"/>
    </svg>
  ),
  win_streak_10: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="21" cy="3" r="2" fill={color}/>
    </svg>
  ),
  legend: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 3h14l2 6-9 12L2 9l3-6z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 3l3 8 3-8M2 9h20" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  perfect_week: ({color,size=28}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17.2l-6.2 4.1 2.4-7.4L2 9.4h7.6L12 2z" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M9.5 12.5l1.5 1.5 3-3.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

// ── Achievement Definitions ────────────────────────────────────────────────────
interface Achievement {
  id: string; title: string; desc: string; iconKey: string;
  check: (trades: Trade[], stats: any, xp?: number) => boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_trade',   iconKey: 'first_trade',   title: 'First Entry',       desc: 'Log your very first trade',                  rarity: 'common',    check: (t) => t.length >= 1 },
  { id: 'hat_trick',     iconKey: 'hat_trick',      title: 'Hat Trick',         desc: '3 consecutive winning trades',                rarity: 'common',    check: (_,s) => s.currentWin >= 3 },
  { id: 'journaler',     iconKey: 'journaler',      title: 'The Archivist',     desc: 'Add notes to 10 trades',                     rarity: 'common',    check: (t) => t.filter(x=>x.narrative?.trim().length>10).length >= 10 },
  { id: 'discipline',    iconKey: 'discipline',     title: 'Iron Protocol',     desc: 'Follow your plan 10 consecutive times',       rarity: 'rare',      check: (t) => { let r=0,b=0; [...t].sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>{ if(x.followedPlan===true){r++;if(r>b)b=r;}else r=0; }); return b>=10; }},
  { id: 'ten_trades',    iconKey: 'ten_trades',     title: 'Volume I',          desc: 'Log 10 trades',                              rarity: 'common',    check: (t) => t.length >= 10 },
  { id: 'fifty_trades',  iconKey: 'fifty_trades',   title: 'Volume II',         desc: 'Log 50 trades',                              rarity: 'rare',      check: (t) => t.length >= 50 },
  { id: 'century',       iconKey: 'century',        title: 'Century',           desc: 'Log 100 trades',                             rarity: 'epic',      check: (t) => t.length >= 100 },
  { id: 'five_hundred',  iconKey: 'five_hundred',   title: 'Five Hundred',      desc: 'Log 500 trades',                             rarity: 'legendary', check: (t) => t.length >= 500 },
  { id: 'win_rate_50',   iconKey: 'win_rate_50',    title: 'Edge Confirmed',    desc: '50%+ win rate across 20+ trades',            rarity: 'common',    check: (t) => t.length>=20 && t.filter(x=>x.pnl>0).length/t.length>=0.5 },
  { id: 'win_rate_65',   iconKey: 'win_rate_65',    title: 'High Precision',    desc: '65%+ win rate across 30+ trades',            rarity: 'rare',      check: (t) => t.length>=30 && t.filter(x=>x.pnl>0).length/t.length>=0.65 },
  { id: 'win_rate_75',   iconKey: 'win_rate_75',    title: 'Marksman',          desc: '75%+ win rate across 50+ trades',            rarity: 'epic',      check: (t) => t.length>=50 && t.filter(x=>x.pnl>0).length/t.length>=0.75 },
  { id: 'a_game',        iconKey: 'a_game',         title: 'Grade A',           desc: 'Log 10 A+ grade trades',                     rarity: 'rare',      check: (t) => t.filter(x=>x.grade==='A+').length >= 10 },
  { id: 'diversified',   iconKey: 'diversified',    title: 'Multi-Market',      desc: 'Trade 5+ different instruments',             rarity: 'common',    check: (t) => new Set(t.map(x=>x.symbol)).size >= 5 },
  { id: 'streak_7',      iconKey: 'streak_7',       title: 'One Week Solid',    desc: 'Maintain a 7-day trading streak',            rarity: 'rare',      check: (_,s) => s.best >= 7 },
  { id: 'streak_30',     iconKey: 'streak_30',      title: 'Monthly Discipline',desc: '30-day consecutive trading streak',          rarity: 'epic',      check: (_,s) => s.best >= 30 },
  { id: 'risk_manager',  iconKey: 'risk_manager',   title: 'Risk Protocol',     desc: '20+ trades with R:R ≥ 2.0',                 rarity: 'rare',      check: (t) => t.filter(x=>Number(x.rr)>=2).length >= 20 },
  { id: 'self_aware',    iconKey: 'self_aware',     title: 'Self Aware',        desc: 'Log emotional state on 20 trades',           rarity: 'rare',      check: (t) => t.filter(x=>x.psychology?.states?.length>0).length >= 20 },
  { id: 'green_month',   iconKey: 'green_month',    title: 'Green Month',       desc: 'Close any calendar month in profit',         rarity: 'epic',      check: (t) => { const m:Record<string,number>={}; t.forEach(x=>{const k=x.date.slice(0,7);m[k]=(m[k]||0)+(Number(x.pnl)||0);}); return Object.values(m).some(v=>v>0); }},
  { id: 'win_streak_5',  iconKey: 'win_streak_5',   title: 'Five Alive',        desc: '5 consecutive winning trades',               rarity: 'rare',      check: (_,s) => s.bestWin >= 5 },
  { id: 'win_streak_10', iconKey: 'win_streak_10',  title: 'Unstoppable',       desc: '10 consecutive winning trades',              rarity: 'epic',      check: (_,s) => s.bestWin >= 10 },
  { id: 'legend',        iconKey: 'legend',         title: 'Legend Rank',       desc: 'Reach the Legend rank',                      rarity: 'legendary', check: (_,__,xp=0) => xp >= 32000 },
  { id: 'perfect_week',  iconKey: 'perfect_week',   title: 'Flawless Week',     desc: '5+ winning trades in a single week, 0 losses',rarity:'legendary',check: (t) => { const w:Record<string,{wn:number,l:number}>={};t.forEach(x=>{const d=new Date(x.date+'T12:00:00');const k=`${d.getFullYear()}-${Math.floor((d.getTime()-new Date(d.getFullYear(),0,1).getTime())/604800000)}`;if(!w[k])w[k]={wn:0,l:0};if(x.pnl>0)w[k].wn++;else w[k].l++;});return Object.values(w).some(v=>v.wn>=5&&v.l===0); }},
];

const RARITY = {
  common:    { label: 'Common',    border: 'rgba(136,150,168,0.25)', glow: 'none',                              bg: 'rgba(136,150,168,0.07)', text: '#8896a8', ring: '#8896a8' },
  rare:      { label: 'Rare',      border: 'rgba(74,158,255,0.45)',  glow: '0 0 24px rgba(74,158,255,0.18)',    bg: 'rgba(74,158,255,0.08)',  text: '#4a9eff', ring: '#4a9eff' },
  epic:      { label: 'Epic',      border: 'rgba(192,132,252,0.45)', glow: '0 0 24px rgba(192,132,252,0.2)',    bg: 'rgba(192,132,252,0.08)', text: '#c084fc', ring: '#c084fc' },
  legendary: { label: 'Legendary', border: 'rgba(251,191,36,0.55)',  glow: '0 0 32px rgba(251,191,36,0.28)',    bg: 'rgba(251,191,36,0.09)',  text: '#f6c547', ring: '#fbbf24' },
};

// Weekly challenges
const getWeeklyChallenges = (trades: Trade[]) => {
  const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
  const wt = trades.filter(t => new Date(t.date+'T12:00:00') >= start);
  const wr = wt.length > 0 ? (wt.filter(t=>t.pnl>0).length/wt.length)*100 : 0;
  return [
    { id:'c1', title:'Active Trader',   desc:'Log 5 trades this week',        goal:5,  cur:wt.length,                         xp:50, iconPath:'M3 12l3-3 3 3 4-4 3 3' },
    { id:'c2', title:'Accuracy Target', desc:'Hit 55%+ win rate this week',    goal:55, cur:Math.round(wr),                    xp:75, iconPath:'M12 20V8m-5 7l5 5 5-5', isPercent:true },
    { id:'c3', title:'Full Journal',    desc:'Add notes to 5 trades',          goal:5,  cur:wt.filter(t=>t.narrative?.trim().length>10).length, xp:60, iconPath:'M4 6h16M4 10h16M4 14h10' },
    { id:'c4', title:'Rule-Based',      desc:'Follow your plan on 5 trades',   goal:5,  cur:wt.filter(t=>t.followedPlan).length, xp:65, iconPath:'M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];
};

// Animated counter
const AnimCounter: React.FC<{value:number;duration?:number}> = ({value,duration=1200}) => {
  const [d, setD] = useState(0);
  useEffect(() => {
    let v = 0; const step = value/(duration/16);
    const id = setInterval(()=>{ v+=step; if(v>=value){setD(value);clearInterval(id);}else setD(Math.floor(v)); },16);
    return ()=>clearInterval(id);
  }, [value]);
  return <>{d.toLocaleString()}</>;
};

// ── Main ──────────────────────────────────────────────────────────────────────
const Gamification: React.FC<Props> = ({ trades, userName }) => {
  const [tab, setTab] = useState<'overview'|'achievements'|'challenges'>('overview');
  const xp = useMemo(()=>calcXP(trades),[trades]);
  const lvl = useMemo(()=>getLevel(xp),[xp]);
  const streaks = useMemo(()=>calcStreaks(trades),[trades]);
  const challenges = useMemo(()=>getWeeklyChallenges(trades),[trades]);
  const achievements = useMemo(()=>ACHIEVEMENTS.map(a=>({...a,unlocked:a.check(trades,streaks,xp)})).sort((a,b)=>{
    if(a.unlocked&&!b.unlocked)return -1; if(!a.unlocked&&b.unlocked)return 1;
    return {legendary:0,epic:1,rare:2,common:3}[a.rarity]-{legendary:0,epic:1,rare:2,common:3}[b.rarity];
  }),[trades,streaks,xp]);

  const unlocked = achievements.filter(a=>a.unlocked).length;
  const winRate = trades.length>0?(trades.filter(t=>t.pnl>0).length/trades.length)*100:0;
  const totalPnL = trades.reduce((s,t)=>s+(Number(t.pnl)||0),0);
  const circ = 2*Math.PI*52;
  const dashOffset = circ-(lvl.progress/100)*circ;

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-700">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10"
        style={{
          background:'linear-gradient(145deg,#0c0c10 0%,#141420 60%,#0c1018 100%)',
          border:`1px solid ${lvl.level.color}28`,
          boxShadow:`0 0 80px ${lvl.level.accent}, inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}>
        {/* bg glow */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none opacity-40"
          style={{background:`radial-gradient(circle,${lvl.level.color}14,transparent 65%)`}}/>
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full pointer-events-none opacity-25"
          style={{background:`radial-gradient(circle,${lvl.level.color}0e,transparent 65%)`}}/>

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
          {/* XP Ring — Apple Watch style */}
          <div className="relative w-[120px] h-[120px] sm:w-[148px] sm:h-[148px] flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
              <circle cx="60" cy="60" r="52" fill="none"
                stroke={lvl.level.color} strokeWidth="8"
                strokeDasharray={circ} strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{transition:'stroke-dashoffset 1.8s cubic-bezier(0.34,1.56,0.64,1)',filter:`drop-shadow(0 0 6px ${lvl.level.color})`}}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="text-3xl sm:text-4xl font-black text-white leading-none tracking-tight">{lvl.index+1}</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{color:lvl.level.color}}>LEVEL</span>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{userName}</h2>
              <span className="inline-flex items-center self-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.16em]"
                style={{background:lvl.level.accent,color:lvl.level.color,border:`1px solid ${lvl.level.color}40`}}>
                {lvl.level.name}
              </span>
            </div>

            <p className="text-[11px] font-bold text-white/30 uppercase tracking-[0.18em]">
              <AnimCounter value={xp}/> XP earned
            </p>

            {/* Progress bar */}
            <div className="max-w-[280px] mx-auto sm:mx-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[8px] font-black uppercase tracking-wider" style={{color:lvl.level.color}}>{lvl.level.name}</span>
                {lvl.next && <span className="text-[8px] font-black text-white/18 uppercase tracking-wider">{(lvl.next.minXP-xp).toLocaleString()} to {lvl.next.name}</span>}
              </div>
              <div className="h-[6px] rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                <div className="h-full rounded-full transition-all duration-1500"
                  style={{width:`${lvl.progress}%`,background:`linear-gradient(90deg,${lvl.level.color},${lvl.next?.color||lvl.level.color})`,boxShadow:`0 0 8px ${lvl.level.color}80`}}/>
              </div>
            </div>

            {/* Mini stats */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-5 pt-1">
              {[
                {v:trades.length, l:'Trades'},
                {v:`${unlocked}/${ACHIEVEMENTS.length}`, l:'Badges'},
                {v:`${streaks.best}d`, l:'Best Streak'},
                {v:`${winRate.toFixed(0)}%`, l:'Win Rate'},
              ].map(s=>(
                <div key={s.l} className="text-center sm:text-left">
                  <p className="text-base sm:text-lg font-black text-white leading-none">{s.v}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/22 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────────────────────── */}
      <div className="flex p-1 apple-glass rounded-[1.2rem] w-fit border border-white/40">
        {([
          {k:'overview',   label:'Overview'},
          {k:'achievements',label:'Badges'},
          {k:'challenges', label:'Challenges'},
        ] as const).map(({k,label})=>(
          <button key={k} onClick={()=>setTab(k)}
            className="px-4 sm:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.12em] transition-all"
            style={tab===k?{background:'#000',color:'#fff',boxShadow:'0 2px 10px rgba(0,0,0,0.3)'}:{color:'rgba(0,0,0,0.3)'}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {tab==='overview' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              {l:'Streak',     v:streaks.current, s:'d', sub: streaks.current>=7?'On Fire':streaks.current===0?'Log today':streaks.current+'d running',
                color: streaks.current>=7?'#fb923c':streaks.current>=3?'#f6c547':'#34d399',
                icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M12 2c-3 5-5 7-5 11a5 5 0 0010 0c0-4-2-6-5-11z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 16c0-2 1-3 2-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/></svg>},
              {l:'Best Streak',v:streaks.best,    s:'d', sub:`${streaks.activeDays} active days`,        color:'#6c83f5',
                icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>},
              {l:'Win Streak', v:streaks.currentWin, s:'', sub:`Best ${streaks.bestWin} consecutive`, color:'#34d399',
                icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>},
              {l:'Net P&L',   v:null, formatted:`${totalPnL>=0?'+':''}$${Math.abs(Math.round(totalPnL)).toLocaleString()}`, sub:`${trades.length} trades total`, color:totalPnL>=0?'#34d399':'#f87171',
                icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M3 17l4-5 4 3 5-7 5 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>},
            ].map(card=>(
              <div key={card.l} className="apple-glass p-5 sm:p-6 rounded-[1.8rem] border border-white/50 overflow-hidden relative group hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
                  style={{background:`radial-gradient(circle at 80% 10%,${card.color}0a,transparent 60%)`}}/>
                <div className="relative z-10">
                  <div className="mb-3" style={{color:card.color}}>{card.icon}</div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-black/30 mb-1">{card.l}</p>
                  <p className="text-2xl sm:text-3xl font-black leading-none" style={{color:card.color}}>
                    {card.formatted || <><AnimCounter value={card.v!}/>{card.s}</>}
                  </p>
                  <p className="text-[9px] font-bold text-black/25 mt-1.5">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Rank roadmap */}
          <div className="apple-glass p-6 sm:p-8 rounded-[2rem] border border-white/50">
            <h3 className="text-[9px] font-black text-black/25 uppercase tracking-[0.3em] mb-7">Rank Progression</h3>
            <div className="relative">
              <div className="absolute top-[21px] left-[24px] right-[24px] h-[2px] rounded-full" style={{background:'rgba(0,0,0,0.06)'}}/>
              <div className="absolute top-[21px] left-[24px] h-[2px] rounded-full transition-all duration-1000"
                style={{
                  width:`${Math.max(0,(lvl.index/(LEVELS.length-1))*100)}%`,
                  maxWidth:'calc(100% - 48px)',
                  background:`linear-gradient(90deg,${LEVELS[0].color},${lvl.level.color})`,
                  boxShadow:`0 0 6px ${lvl.level.color}80`,
                }}/>
              <div className="flex justify-between relative z-10">
                {LEVELS.map((l,i)=>{
                  const reached = i<=lvl.index; const isCur = i===lvl.index;
                  return (
                    <div key={l.name} className="flex flex-col items-center gap-2">
                      <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all duration-300"
                        style={{
                          background: reached ? l.color : 'rgba(0,0,0,0.05)',
                          boxShadow: isCur ? `0 0 0 3px rgba(255,255,255,0.9), 0 0 0 5px ${l.color}, 0 0 20px ${l.color}60` : 'none',
                          transform: isCur ? 'scale(1.1)' : 'scale(1)',
                        }}>
                        <span className="text-[10px] font-black" style={{color:reached?'rgba(255,255,255,0.9)':'rgba(0,0,0,0.15)'}}>{i+1}</span>
                      </div>
                      <span className="text-[7px] font-black uppercase tracking-wide hidden sm:block"
                        style={{color:reached?l.color:'rgba(0,0,0,0.2)'}}>{l.name.slice(0,5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {lvl.next && (
              <p className="text-[10px] font-bold text-black/30 text-center mt-6">
                <span className="font-black text-black/60">{(lvl.next.minXP-xp).toLocaleString()} XP</span> to unlock{' '}
                <span className="font-black" style={{color:lvl.next.color}}>{lvl.next.name}</span>
              </p>
            )}
          </div>

          {/* Recent badges unlocked */}
          {unlocked > 0 && (
            <div className="apple-glass p-6 sm:p-8 rounded-[2rem] border border-white/50">
              <h3 className="text-[9px] font-black text-black/25 uppercase tracking-[0.3em] mb-5">Badges Earned</h3>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {achievements.filter(a=>a.unlocked).slice(0,10).map(a=>{
                  const rs=RARITY[a.rarity];
                  const Icon=AchievementIcons[a.iconKey];
                  return (
                    <div key={a.id} className="flex-shrink-0 flex flex-col items-center gap-2 w-[72px]">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
                        style={{background:rs.bg,border:`1px solid ${rs.border}`,boxShadow:rs.glow}}>
                        {Icon && <Icon color={rs.ring} size={26}/>}
                      </div>
                      <p className="text-[7px] font-black uppercase tracking-wide text-center leading-tight text-black/50">{a.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACHIEVEMENTS ─────────────────────────────────────────────────── */}
      {tab==='achievements' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-black text-black/30 uppercase tracking-widest">{unlocked} of {ACHIEVEMENTS.length} earned</p>
            <div className="flex gap-1.5">
              {(['legendary','epic','rare','common'] as const).map(r=>{
                const rs=RARITY[r]; const count=achievements.filter(a=>a.rarity===r&&a.unlocked).length; const total=achievements.filter(a=>a.rarity===r).length;
                return (
                  <div key={r} className="px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-wide"
                    style={{background:rs.bg,color:rs.text,border:`1px solid ${rs.border}`}}>
                    {count}/{total}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {achievements.map(a=>{
              const rs = RARITY[a.rarity];
              const Icon = AchievementIcons[a.iconKey];
              return (
                <div key={a.id}
                  className="relative rounded-[1.6rem] p-4 sm:p-5 transition-all duration-300"
                  style={{
                    background: a.unlocked ? rs.bg : 'rgba(0,0,0,0.025)',
                    border: `1px solid ${a.unlocked ? rs.border : 'rgba(0,0,0,0.06)'}`,
                    boxShadow: a.unlocked ? rs.glow : 'none',
                    opacity: a.unlocked ? 1 : 0.4,
                  }}>
                  {/* Rarity corner mark */}
                  {a.unlocked && (
                    <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full" style={{background:rs.ring}}/>
                  )}
                  {/* Lock icon for locked */}
                  {!a.unlocked && (
                    <div className="absolute top-3 right-3 opacity-30">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                    </div>
                  )}

                  {/* Icon */}
                  <div className="w-11 h-11 rounded-[1rem] flex items-center justify-center mb-3"
                    style={{
                      background: a.unlocked ? `${rs.ring}15` : 'rgba(0,0,0,0.04)',
                      filter: a.unlocked ? 'none' : 'grayscale(1)',
                    }}>
                    {Icon && <Icon color={a.unlocked ? rs.ring : 'rgba(0,0,0,0.2)'} size={22}/>}
                  </div>

                  <p className="text-[11px] font-black text-black leading-tight mb-0.5">{a.title}</p>
                  <p className="text-[9px] font-bold leading-snug" style={{color:'rgba(0,0,0,0.32)'}}>{a.desc}</p>

                  {a.unlocked && (
                    <div className="mt-3">
                      <span className="text-[7px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
                        style={{background:`${rs.ring}18`,color:rs.text,border:`1px solid ${rs.border}`}}>
                        {rs.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CHALLENGES ───────────────────────────────────────────────────── */}
      {tab==='challenges' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <p className="text-[9px] font-black text-black/25 uppercase tracking-widest px-1">This Week — resets Sunday</p>
          {challenges.map(ch=>{
            const pct = Math.min((ch.cur/ch.goal)*100,100); const done = ch.cur>=ch.goal;
            return (
              <div key={ch.id} className="apple-glass p-5 sm:p-6 rounded-[2rem] border relative overflow-hidden transition-all"
                style={{borderColor: done?'rgba(52,211,153,0.3)':'rgba(255,255,255,0.5)'}}>
                {done && <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse at 95% 50%,rgba(52,211,153,0.06),transparent 55%)'}}/>}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{background:done?'rgba(52,211,153,0.12)':'rgba(0,0,0,0.05)'}}>
                      <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5" style={{width:18,height:18,color:done?'#34d399':'rgba(0,0,0,0.3)'}}>
                        <path d={ch.iconPath} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-black text-black leading-tight">{ch.title}</p>
                      <p className="text-[9px] font-bold text-black/35 mt-0.5">{ch.desc}</p>
                    </div>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full shrink-0 ml-3"
                    style={done
                      ?{background:'rgba(52,211,153,0.1)',color:'#34d399',border:'1px solid rgba(52,211,153,0.25)'}
                      :{background:'rgba(0,0,0,0.04)',color:'rgba(0,0,0,0.3)'}}>
                    {done ? 'Done' : `+${ch.xp} XP`}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[9px] font-bold text-black/30">{ch.cur}{ch.isPercent?'%':''} / {ch.goal}{ch.isPercent?'%':''}</span>
                    <span className="text-[9px] font-black" style={{color:done?'#34d399':'rgba(0,0,0,0.5)'}}>{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(0,0,0,0.06)'}}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width:`${pct}%`,
                        background: done?'linear-gradient(90deg,#34d399,#10b981)':'linear-gradient(90deg,#1a1a1a,#383838)',
                        boxShadow: done?'0 0 8px rgba(52,211,153,0.5)':'none',
                      }}/>
                  </div>
                </div>
              </div>
            );
          })}

          {/* XP breakdown */}
          <div className="apple-glass p-6 sm:p-8 rounded-[2rem] border border-white/50 mt-2">
            <h3 className="text-[9px] font-black text-black/25 uppercase tracking-[0.3em] mb-5">XP Per Action</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {a:'Log a trade',        xp:'+10', icon:'M12 4v16M4 12h16'},
                {a:'Winning trade',      xp:'+5',  icon:'M3 17l4-5 4 3 5-7 5 4'},
                {a:'Followed plan',      xp:'+4',  icon:'M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z'},
                {a:'A+ grade',           xp:'+10', icon:'M6 20l6-16 6 16M8.5 14h7'},
                {a:'A grade',            xp:'+6',  icon:'M6 20l6-14 6 14M9 13h6'},
                {a:'Write notes',        xp:'+3',  icon:'M4 6h16M4 10h16M4 14h10'},
                {a:'Add tags',           xp:'+1',  icon:'M7 7h.01M7 3h5l8.5 8.5a1.5 1.5 0 010 2.1L15 19a1.5 1.5 0 01-2.1 0L4 12V7a4 4 0 014-4z'},
                {a:'Log emotion',        xp:'+2',  icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'},
              ].map(row=>(
                <div key={row.a} className="flex items-center justify-between bg-black/[0.03] border border-black/[0.04] rounded-[14px] px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13,color:'rgba(0,0,0,0.3)',flexShrink:0}}>
                      <path d={row.icon} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-[9px] font-bold text-black/45 leading-tight">{row.a}</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 shrink-0 ml-2">{row.xp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gamification;
