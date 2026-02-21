<div align="center">

# TradeFlow Studio

**The professional trading journal for serious traders.**  
AI-powered insights · Multi-account management · Psychology tracking · Advanced analytics

[Live App](https://app.tradeflowstudio.com) · [Landing Page](https://tradeflowstudio.com) · [Support](mailto:support@tradeflowstudio.com)

</div>

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| AI | Google Gemini 2.0 Flash |
| Backend / Auth | Supabase (PostgreSQL + RLS) |
| Hosting | Netlify |
| Payments | Stripe |

---

## Local Development

**Prerequisites:** Node.js 18+

```bash
npm install
```

Create `.env.local`:
```
GEMINI_API_KEY=your_gemini_key_from_aistudio.google.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your_supabase_anon_key
```

```bash
npm run dev
```

---

## Supabase Setup

Run **both SQL files** in your Supabase SQL Editor in this order:

1. `setup.sql` — creates accounts and trades tables with RLS policies
2. `profiles_setup.sql` — creates profiles table with plan column and auto-trigger

---

## Netlify Deployment

Set these environment variables in Netlify → Site Settings → Environment Variables:

```
GEMINI_API_KEY     → your Gemini API key
VITE_SUPABASE_URL  → https://your-project.supabase.co
VITE_SUPABASE_KEY  → your Supabase anon key
```

Build command: `npm run build`  
Publish directory: `dist`

---

## Subscription Plans

| Feature | Free | Pro ($8.99/mo) |
|---------|------|----------------|
| Trades/month | 15 | Unlimited |
| Accounts | 1 | Unlimited |
| Analytics | — | ✓ |
| Psychology Tracker | — | ✓ |
| AI Insights (Gemini) | — | ✓ |
| CSV Import | — | ✓ |
| CSV Export | ✓ | ✓ |
| Google Sheets Sync | — | ✓ |
| Cloud Sync | ✓ | ✓ |

---

## Project Structure

```
├── App.tsx                  # Root component, routing, state
├── components/
│   ├── Auth.tsx             # Login / register
│   ├── Dashboard.tsx        # Performance overview
│   ├── TradeLog.tsx         # Trade list with tag filtering
│   ├── TradeForm.tsx        # Add/edit trade form
│   ├── Analytics.tsx        # Advanced analytics (Pro)
│   ├── Psychology.tsx       # Psychology tracker (Pro)
│   ├── AIPage.tsx           # Gemini AI insights (Pro)
│   ├── Calendar.tsx         # P&L heat map calendar
│   ├── AccountManager.tsx   # Multi-account manager
│   ├── SyncSettings.tsx     # Settings, import/export, sync
│   └── ProfileSettings.tsx  # User profile & plan info
├── services/
│   ├── supabase.ts          # Supabase client + auth helpers
│   ├── planService.ts       # Plan gating + trade limits
│   ├── storage.ts           # CSV export/import + local storage
│   ├── sync.ts              # Google Sheets sync
│   └── geminiService.ts     # Gemini AI integration
├── setup.sql                # Accounts + trades tables + RLS
└── profiles_setup.sql       # Profiles table + plan trigger
```

---
--Backend Keys for deployment--
 VITE_SUPABASE_URL
 VITE_SUPABASE_KEY
 SUPABASE_SERVICE_ROLE_KEY
 VITE_GEMINI_API_KEY
 STRIPE_SECRET_KEY
 VITE_STRIPE_PRICE_ID
 VITE_STRIPE_PAYMENT_LINK
 STRIPE_WEBHOOK_SECRET
 VITE_OWNER_EMAIL
---

## Support

Email: support@tradeflowstudio.com
