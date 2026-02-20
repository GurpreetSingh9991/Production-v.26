-- ============================================================
-- TradeFlow Studio — Full Database Setup
-- Run this once in your Supabase SQL Editor
-- ============================================================

-- 1. Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    initial_balance NUMERIC DEFAULT 0 NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    color TEXT DEFAULT '#000000',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Trades Table
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    date DATE NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT CHECK (side IN ('LONG', 'SHORT')) NOT NULL,
    qty NUMERIC DEFAULT 1,
    entry_price NUMERIC DEFAULT 0,
    exit_price NUMERIC DEFAULT 0,
    pnl NUMERIC DEFAULT 0,
    gross_pnl NUMERIC DEFAULT 0,
    total_fees NUMERIC DEFAULT 0,
    setup_type TEXT DEFAULT '',
    result_grade TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    narrative TEXT DEFAULT '',
    rr NUMERIC DEFAULT 0,
    followed_plan BOOLEAN DEFAULT false,
    pre_mood INTEGER,
    post_mood INTEGER,
    emotional_tags TEXT[] DEFAULT '{}',
    multiplier NUMERIC DEFAULT 1,
    entry_time TEXT DEFAULT '09:30',
    exit_time TEXT DEFAULT '10:00',
    duration TEXT DEFAULT '',
    executions JSONB DEFAULT '[]',
    image_urls TEXT[] DEFAULT '{}'
);

-- 3. Profiles Table (plan + Stripe)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Add missing columns if upgrading from older schema
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='plan') THEN
        ALTER TABLE public.profiles ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='stripe_customer_id') THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
    END IF;
END $$;

-- 5. Auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own accounts') THEN
        CREATE POLICY "Users can manage their own accounts"
        ON public.accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own trades') THEN
        CREATE POLICY "Users can manage their own trades"
        ON public.trades FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own profile') THEN
        CREATE POLICY "Users can manage their own profile"
        ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    END IF;
END $$;
