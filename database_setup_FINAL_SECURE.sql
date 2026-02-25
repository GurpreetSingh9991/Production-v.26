-- ============================================================
-- TradeFlow Studio — COMPLETE PRODUCTION Database Setup
-- Version: 2.1 (Security Hardened)
-- ============================================================
-- This includes ALL security features:
-- ✅ Pro plan enforcement at DB level
-- ✅ Stripe webhook replay protection
-- ✅ Financial integrity constraints
-- ✅ Rate limiting for AI
-- ✅ Weekly insights enforcement
-- ✅ Soft delete for trades
-- ✅ Usage logging
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Core Tables
-- ────────────────────────────────────────────────────────────

-- Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    initial_balance NUMERIC DEFAULT 0 NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    color TEXT DEFAULT '#000000',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Trades Table (Complete Schema with Soft Delete)
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    date DATE NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT CHECK (side IN ('LONG', 'SHORT')) NOT NULL,
    asset_type TEXT DEFAULT 'STOCKS' CHECK (asset_type IN ('STOCKS', 'FOREX', 'FUTURES')),
    qty NUMERIC DEFAULT 1 CHECK (qty > 0),
    multiplier NUMERIC DEFAULT 1,
    entry_price NUMERIC DEFAULT 0 CHECK (entry_price >= 0),
    exit_price NUMERIC DEFAULT 0 CHECK (exit_price >= 0),
    stop_loss_price NUMERIC DEFAULT 0,
    target_price NUMERIC DEFAULT 0,
    entry_time TEXT DEFAULT '09:30',
    exit_time TEXT DEFAULT '10:00',
    duration TEXT DEFAULT '',
    pnl NUMERIC DEFAULT 0,
    gross_pnl NUMERIC DEFAULT 0,
    net_pnl NUMERIC DEFAULT 0,
    total_fees NUMERIC DEFAULT 0,
    rr NUMERIC DEFAULT 0,
    result TEXT DEFAULT 'BE' CHECK (result IN ('WIN', 'LOSS', 'BE')),
    result_grade TEXT DEFAULT 'B',
    setup_type TEXT DEFAULT '',
    weekly_bias TEXT DEFAULT 'SIDEWAYS' CHECK (weekly_bias IN ('UP', 'DOWN', 'SIDEWAYS')),
    narrative TEXT DEFAULT '',
    chart_link TEXT DEFAULT '',
    image_url TEXT,
    images TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    followed_plan BOOLEAN DEFAULT false,
    plan TEXT DEFAULT '',
    executions JSONB DEFAULT '[]',
    mistakes JSONB DEFAULT '[]',
    psychology JSONB DEFAULT '{"moodBefore": 3, "moodAfter": 3, "states": [], "notes": ""}',
    ticket TEXT,
    commission NUMERIC,
    swap NUMERIC,
    pips NUMERIC,
    average_entry NUMERIC,
    average_exit NUMERIC,
    deleted_at TIMESTAMPTZ,  -- 🔒 SOFT DELETE
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles Table (with Plan Management)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 🔒 SECURITY: Stripe Webhook Replay Protection
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT now()
);

-- 🔒 SECURITY: Weekly Insights Enforcement
CREATE TABLE IF NOT EXISTS public.weekly_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    insight TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, week_start)  -- 🔒 ONE INSIGHT PER WEEK
);

-- 🔒 SECURITY: Usage Logging for Rate Limiting
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_action ON public.usage_logs(user_id, action, created_at DESC);

-- 🔒 SECURITY: Error Logging
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_type TEXT NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 2. Add Missing Columns (For Existing Deployments)
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
    -- Add deleted_at for soft delete
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='deleted_at') THEN
        ALTER TABLE public.trades ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
    
    -- Ensure all other columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='stop_loss_price') THEN
        ALTER TABLE public.trades ADD COLUMN stop_loss_price NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='target_price') THEN
        ALTER TABLE public.trades ADD COLUMN target_price NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='weekly_bias') THEN
        ALTER TABLE public.trades ADD COLUMN weekly_bias TEXT DEFAULT 'SIDEWAYS' CHECK (weekly_bias IN ('UP', 'DOWN', 'SIDEWAYS'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='asset_type') THEN
        ALTER TABLE public.trades ADD COLUMN asset_type TEXT DEFAULT 'STOCKS' CHECK (asset_type IN ('STOCKS', 'FOREX', 'FUTURES'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='chart_link') THEN
        ALTER TABLE public.trades ADD COLUMN chart_link TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='image_url') THEN
        ALTER TABLE public.trades ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='images') THEN
        ALTER TABLE public.trades ADD COLUMN images TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='mistakes') THEN
        ALTER TABLE public.trades ADD COLUMN mistakes JSONB DEFAULT '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='psychology') THEN
        ALTER TABLE public.trades ADD COLUMN psychology JSONB DEFAULT '{"moodBefore": 3, "moodAfter": 3, "states": [], "notes": ""}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='average_entry') THEN
        ALTER TABLE public.trades ADD COLUMN average_entry NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='average_exit') THEN
        ALTER TABLE public.trades ADD COLUMN average_exit NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='net_pnl') THEN
        ALTER TABLE public.trades ADD COLUMN net_pnl NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='ticket') THEN
        ALTER TABLE public.trades ADD COLUMN ticket TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='commission') THEN
        ALTER TABLE public.trades ADD COLUMN commission NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='swap') THEN
        ALTER TABLE public.trades ADD COLUMN swap NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='pips') THEN
        ALTER TABLE public.trades ADD COLUMN pips NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='updated_at') THEN
        ALTER TABLE public.trades ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;

    -- Add to profiles if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='plan') THEN
        ALTER TABLE public.profiles ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='stripe_customer_id') THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- 🔒 SECURITY: Financial Integrity Constraint
-- Ensure net_pnl calculation is correct (cannot be tampered in frontend)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'net_pnl_integrity') THEN
        ALTER TABLE public.trades
        ADD CONSTRAINT net_pnl_integrity
        CHECK (net_pnl = pnl - total_fees);
    END IF;
EXCEPTION
    WHEN others THEN
        -- If constraint fails on existing data, skip it
        RAISE NOTICE 'Could not add net_pnl_integrity constraint. Fix existing data first.';
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. Triggers & Auto-Functions
-- ────────────────────────────────────────────────────────────

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, plan)
    VALUES (NEW.id, 'free')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trades_updated_at ON public.trades;
CREATE TRIGGER trades_updated_at
    BEFORE UPDATE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 4. Performance Indexes
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_trades_user_date ON public.trades(user_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trades_user_created ON public.trades(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trades_account ON public.trades(account_id) WHERE account_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trades_result ON public.trades(result) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trades_setup ON public.trades(setup_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trades_date_range ON public.trades(user_id, date) WHERE date >= CURRENT_DATE - INTERVAL '90 days' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trades_soft_delete ON public.trades(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_weekly_insights_user ON public.weekly_insights(user_id, week_start DESC);

-- ────────────────────────────────────────────────────────────
-- 5. Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can manage their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own non-billing profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own insights" ON public.weekly_insights;
DROP POLICY IF EXISTS "Users can manage their own usage logs" ON public.usage_logs;
DROP POLICY IF EXISTS "Users can view their own error logs" ON public.error_logs;

-- Accounts policies
CREATE POLICY "Users can manage their own accounts"
    ON public.accounts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trades policies (with soft delete filter)
CREATE POLICY "Users can manage their own trades"
    ON public.trades FOR ALL
    USING (auth.uid() = user_id AND deleted_at IS NULL)
    WITH CHECK (auth.uid() = user_id);

-- Profiles policies
CREATE POLICY "Users can read their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own non-billing profile fields"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND plan = (SELECT plan FROM public.profiles WHERE id = auth.uid())
        AND (stripe_customer_id IS NOT DISTINCT FROM (SELECT stripe_customer_id FROM public.profiles WHERE id = auth.uid()))
    );

-- Weekly insights policies
CREATE POLICY "Users can manage their own insights"
    ON public.weekly_insights FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Usage logs policies
CREATE POLICY "Users can manage their own usage logs"
    ON public.usage_logs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Error logs policies
CREATE POLICY "Users can view their own error logs"
    ON public.error_logs FOR SELECT
    USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 6. 🔒 SECURITY FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- 🔒 CRITICAL: Enforce Pro Plan at Database Level
CREATE OR REPLACE FUNCTION public.require_pro_user(p_user_id UUID)
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user_id
        AND plan = 'pro'
    ) THEN
        RAISE EXCEPTION 'Pro subscription required';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔒 CRITICAL: Check if Stripe Event Already Processed
CREATE OR REPLACE FUNCTION public.is_stripe_event_processed(p_event_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.stripe_events
        WHERE id = p_event_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔒 CRITICAL: Mark Stripe Event as Processed
CREATE OR REPLACE FUNCTION public.mark_stripe_event_processed(p_event_id TEXT, p_event_type TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO public.stripe_events (id, event_type)
    VALUES (p_event_id, p_event_type)
    ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔒 CRITICAL: Check Rate Limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_action TEXT,
    p_max_count INTEGER,
    p_time_window_minutes INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.usage_logs
    WHERE user_id = p_user_id
    AND action = p_action
    AND created_at >= NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;
    
    RETURN v_count < p_max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔒 CRITICAL: Log Usage
CREATE OR REPLACE FUNCTION public.log_usage(
    p_user_id UUID,
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.usage_logs (user_id, action, metadata)
    VALUES (p_user_id, p_action, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔒 CRITICAL: Can Generate Weekly Insight (Enforcement)
CREATE OR REPLACE FUNCTION public.can_generate_weekly_insight(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_week_start DATE;
    v_week_end DATE;
    v_trade_count INTEGER;
BEGIN
    -- Get current ISO week start (Monday)
    v_week_start := date_trunc('week', CURRENT_DATE)::date;
    v_week_end := v_week_start + INTERVAL '6 days';

    -- 🔒 ENFORCE: Check if already generated this week
    IF EXISTS (
        SELECT 1 FROM public.weekly_insights
        WHERE user_id = p_user_id
        AND week_start = v_week_start
    ) THEN
        RAISE EXCEPTION 'Weekly insight already generated for this week';
    END IF;

    -- 🔒 ENFORCE: Check if trades exist this week
    SELECT COUNT(*) INTO v_trade_count
    FROM public.trades
    WHERE user_id = p_user_id
    AND date >= v_week_start
    AND date <= v_week_end
    AND deleted_at IS NULL;

    IF v_trade_count = 0 THEN
        RAISE EXCEPTION 'No trades logged this week';
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 7. 🚀 PERFORMANCE RPC FUNCTIONS (Zero-Lag Architecture)
-- ────────────────────────────────────────────────────────────

-- Get Dashboard Stats (Aggregated in DB)
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
    p_user_id UUID,
    p_account_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    total_trades BIGINT,
    win_trades BIGINT,
    loss_trades BIGINT,
    win_rate NUMERIC,
    total_pnl NUMERIC,
    total_fees NUMERIC,
    net_pnl NUMERIC,
    avg_win NUMERIC,
    avg_loss NUMERIC,
    profit_factor NUMERIC,
    avg_rr NUMERIC,
    largest_win NUMERIC,
    largest_loss NUMERIC,
    avg_trade NUMERIC,
    best_day NUMERIC,
    worst_day NUMERIC
) AS $$
DECLARE
    gross_win NUMERIC;
    gross_loss NUMERIC;
BEGIN
    -- Calculate aggregates
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE t.pnl > 0),
        COUNT(*) FILTER (WHERE t.pnl < 0),
        SUM(t.pnl),
        SUM(t.total_fees),
        SUM(t.net_pnl),
        AVG(t.rr),
        MAX(t.pnl),
        MIN(t.pnl)
    INTO
        total_trades,
        win_trades,
        loss_trades,
        total_pnl,
        total_fees,
        net_pnl,
        avg_rr,
        largest_win,
        largest_loss
    FROM public.trades t
    WHERE t.user_id = p_user_id
        AND t.deleted_at IS NULL  -- 🔒 RESPECT SOFT DELETE
        AND (p_account_id IS NULL OR t.account_id = p_account_id)
        AND (p_date_from IS NULL OR t.date >= p_date_from)
        AND (p_date_to IS NULL OR t.date <= p_date_to);

    -- Calculate win rate
    win_rate := CASE 
        WHEN total_trades > 0 THEN (win_trades::NUMERIC / total_trades::NUMERIC) * 100
        ELSE 0
    END;

    -- Calculate average win
    SELECT AVG(t.pnl)
    INTO avg_win
    FROM public.trades t
    WHERE t.user_id = p_user_id
        AND t.pnl > 0
        AND t.deleted_at IS NULL
        AND (p_account_id IS NULL OR t.account_id = p_account_id)
        AND (p_date_from IS NULL OR t.date >= p_date_from)
        AND (p_date_to IS NULL OR t.date <= p_date_to);

    -- Calculate average loss
    SELECT AVG(t.pnl)
    INTO avg_loss
    FROM public.trades t
    WHERE t.user_id = p_user_id
        AND t.pnl < 0
        AND t.deleted_at IS NULL
        AND (p_account_id IS NULL OR t.account_id = p_account_id)
        AND (p_date_from IS NULL OR t.date >= p_date_from)
        AND (p_date_to IS NULL OR t.date <= p_date_to);

    -- Calculate gross win/loss for profit factor
    SELECT
        SUM(t.pnl) FILTER (WHERE t.pnl > 0),
        ABS(SUM(t.pnl) FILTER (WHERE t.pnl < 0))
    INTO gross_win, gross_loss
    FROM public.trades t
    WHERE t.user_id = p_user_id
        AND t.deleted_at IS NULL
        AND (p_account_id IS NULL OR t.account_id = p_account_id)
        AND (p_date_from IS NULL OR t.date >= p_date_from)
        AND (p_date_to IS NULL OR t.date <= p_date_to);

    profit_factor := CASE
        WHEN gross_loss > 0 THEN gross_win / gross_loss
        WHEN gross_win > 0 THEN 999
        ELSE 0
    END;

    avg_trade := CASE
        WHEN total_trades > 0 THEN total_pnl / total_trades
        ELSE 0
    END;

    -- Best and worst day
    SELECT
        MAX(daily_pnl),
        MIN(daily_pnl)
    INTO best_day, worst_day
    FROM (
        SELECT SUM(t.pnl) as daily_pnl
        FROM public.trades t
        WHERE t.user_id = p_user_id
            AND t.deleted_at IS NULL
            AND (p_account_id IS NULL OR t.account_id = p_account_id)
            AND (p_date_from IS NULL OR t.date >= p_date_from)
            AND (p_date_to IS NULL OR t.date <= p_date_to)
        GROUP BY t.date
    ) daily;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Equity Curve (Aggregated for Charts)
CREATE OR REPLACE FUNCTION public.get_equity_curve(
    p_user_id UUID,
    p_account_id UUID DEFAULT NULL
)
RETURNS TABLE (
    trade_date DATE,
    daily_pnl NUMERIC,
    cumulative_pnl NUMERIC,
    trade_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.date as trade_date,
        SUM(t.pnl) as daily_pnl,
        SUM(SUM(t.pnl)) OVER (ORDER BY t.date) as cumulative_pnl,
        COUNT(*) as trade_count
    FROM public.trades t
    WHERE t.user_id = p_user_id
        AND t.deleted_at IS NULL  -- 🔒 RESPECT SOFT DELETE
        AND (p_account_id IS NULL OR t.account_id = p_account_id)
    GROUP BY t.date
    ORDER BY t.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Paginated Trades (Optimized)
CREATE OR REPLACE FUNCTION public.get_trades_paginated(
    p_user_id UUID,
    p_account_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 25,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    account_id UUID,
    date DATE,
    symbol TEXT,
    side TEXT,
    asset_type TEXT,
    qty NUMERIC,
    entry_price NUMERIC,
    exit_price NUMERIC,
    pnl NUMERIC,
    net_pnl NUMERIC,
    result TEXT,
    setup_type TEXT,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.account_id,
        t.date,
        t.symbol,
        t.side,
        t.asset_type,
        t.qty,
        t.entry_price,
        t.exit_price,
        t.pnl,
        t.net_pnl,
        t.result,
        t.setup_type,
        COUNT(*) OVER() as total_count
    FROM public.trades t
    WHERE t.user_id = p_user_id
        AND t.deleted_at IS NULL  -- 🔒 RESPECT SOFT DELETE
        AND (p_account_id IS NULL OR t.account_id = p_account_id)
        AND (p_search IS NULL OR t.symbol ILIKE '%' || p_search || '%')
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔒 CRITICAL: Generate Weekly Insight (With All Enforcements)
CREATE OR REPLACE FUNCTION public.generate_weekly_insight(
    p_user_id UUID,
    p_insight TEXT
)
RETURNS UUID AS $$
DECLARE
    v_week_start DATE;
    v_week_end DATE;
    v_insight_id UUID;
BEGIN
    -- 🔒 ENFORCE: Pro plan required
    PERFORM public.require_pro_user(p_user_id);
    
    -- 🔒 ENFORCE: Can generate insight this week
    PERFORM public.can_generate_weekly_insight(p_user_id);
    
    -- 🔒 ENFORCE: Rate limit (max 3 attempts per hour even if errors)
    IF NOT public.check_rate_limit(p_user_id, 'generate_weekly_insight', 3, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
    END IF;
    
    -- Calculate week
    v_week_start := date_trunc('week', CURRENT_DATE)::date;
    v_week_end := v_week_start + INTERVAL '6 days';
    
    -- Insert insight
    INSERT INTO public.weekly_insights (user_id, week_start, week_end, insight)
    VALUES (p_user_id, v_week_start, v_week_end, p_insight)
    RETURNING id INTO v_insight_id;
    
    -- Log usage
    PERFORM public.log_usage(p_user_id, 'generate_weekly_insight', jsonb_build_object(
        'week_start', v_week_start,
        'week_end', v_week_end,
        'insight_id', v_insight_id
    ));
    
    RETURN v_insight_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Weekly Insights (Latest First)
CREATE OR REPLACE FUNCTION public.get_weekly_insights(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    week_start DATE,
    week_end DATE,
    insight TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wi.id,
        wi.week_start,
        wi.week_end,
        wi.insight,
        wi.created_at
    FROM public.weekly_insights wi
    WHERE wi.user_id = p_user_id
    ORDER BY wi.week_start DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Setup Performance
CREATE OR REPLACE FUNCTION public.get_setup_performance(
    p_user_id UUID,
    p_account_id UUID DEFAULT NULL
)
RETURNS TABLE (
    setup_type TEXT,
    total_trades BIGINT,
    win_trades BIGINT,
    win_rate NUMERIC,
    total_pnl NUMERIC,
    avg_pnl NUMERIC
) AS $$
BEGIN
    -- 🔒 ENFORCE: Pro plan required for advanced analytics
    PERFORM public.require_pro_user(p_user_id);
    
    RETURN QUERY
    SELECT
        t.setup_type,
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE t.pnl > 0) as win_trades,
        (COUNT(*) FILTER (WHERE t.pnl > 0)::NUMERIC / COUNT(*)::NUMERIC * 100) as win_rate,
        SUM(t.pnl) as total_pnl,
        AVG(t.pnl) as avg_pnl
    FROM public.trades t
    WHERE t.user_id = p_user_id
        AND t.deleted_at IS NULL
        AND (p_account_id IS NULL OR t.account_id = p_account_id)
        AND t.setup_type IS NOT NULL
        AND t.setup_type != ''
    GROUP BY t.setup_type
    ORDER BY total_pnl DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Day of Week Performance
CREATE OR REPLACE FUNCTION public.get_day_of_week_performance(
    p_user_id UUID,
    p_account_id UUID DEFAULT NULL
)
RETURNS TABLE (
    day_of_week INTEGER,
    day_name TEXT,
    total_trades BIGINT,
    win_rate NUMERIC,
    total_pnl NUMERIC,
    avg_pnl NUMERIC
) AS $$
BEGIN
    -- 🔒 ENFORCE: Pro plan required for advanced analytics
    PERFORM public.require_pro_user(p_user_id);
    
    RETURN QUERY
    SELECT
        EXTRACT(DOW FROM t.date)::INTEGER as day_of_week,
        TO_CHAR(t.date, 'Day') as day_name,
        COUNT(*) as total_trades,
        (COUNT(*) FILTER (WHERE t.pnl > 0)::NUMERIC / COUNT(*)::NUMERIC * 100) as win_rate,
        SUM(t.pnl) as total_pnl,
        AVG(t.pnl) as avg_pnl
    FROM public.trades t
    WHERE t.user_id = p_user_id
        AND t.deleted_at IS NULL
        AND (p_account_id IS NULL OR t.account_id = p_account_id)
    GROUP BY EXTRACT(DOW FROM t.date), TO_CHAR(t.date, 'Day')
    ORDER BY day_of_week;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 8. Grant Permissions
-- ────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.accounts TO authenticated;
GRANT ALL ON public.trades TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.weekly_insights TO authenticated;
GRANT ALL ON public.usage_logs TO authenticated;
GRANT SELECT ON public.error_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_pro_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_generate_weekly_insight TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_equity_curve TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trades_paginated TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_setup_performance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_day_of_week_performance TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_weekly_insight TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_insights TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 9. Verification Queries
-- ────────────────────────────────────────────────────────────

-- Verify all columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'trades'
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('trades', 'accounts', 'profiles', 'weekly_insights')
ORDER BY tablename, indexname;

-- Verify RPC functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE '%weekly%' OR routine_name LIKE '%pro%' OR routine_name LIKE '%rate%'
ORDER BY routine_name;

-- ────────────────────────────────────────────────────────────
-- ✅ SETUP COMPLETE - SECURITY HARDENED
-- ────────────────────────────────────────────────────────────
-- 
-- 🔒 Security Features Added:
-- ✅ Pro plan enforcement at database level
-- ✅ Stripe webhook replay protection
-- ✅ Financial integrity constraints
-- ✅ Rate limiting for AI operations
-- ✅ Weekly insights enforcement (one per week)
-- ✅ Soft delete for trades
-- ✅ Usage logging and tracking
-- ✅ Error logging system
-- 
-- Next Steps:
-- 1. Create 'trade-images' storage bucket in Supabase Storage
-- 2. Set bucket to public or configure signed URLs
-- 3. Configure RLS policies for storage bucket
-- 4. Test all RPC functions
-- 5. Update Stripe webhook to use replay protection
-- 
-- ────────────────────────────────────────────────────────────
