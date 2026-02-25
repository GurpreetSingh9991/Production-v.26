-- 1. Create Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    initial_balance NUMERIC DEFAULT 0 NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    color TEXT DEFAULT '#000000',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Trades Table
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    date DATE NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT CHECK (side IN ('LONG', 'SHORT')) NOT NULL,
    asset_type TEXT DEFAULT 'STOCKS',
    qty NUMERIC NOT NULL,
    multiplier NUMERIC DEFAULT 1,
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC NOT NULL,
    stop_loss_price NUMERIC,
    target_price NUMERIC,
    entry_time TEXT,
    exit_time TEXT,
    duration TEXT,
    pnl NUMERIC NOT NULL,
    rr NUMERIC DEFAULT 0,
    result TEXT CHECK (result IN ('WIN', 'LOSS', 'BE')),
    result_grade TEXT,
    setup_type TEXT,
    weekly_bias TEXT,
    narrative TEXT,
    chart_link TEXT,
    image_url TEXT,
    tags TEXT[] DEFAULT '{}',
    followed_plan BOOLEAN DEFAULT true,
    plan TEXT,
    executions JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    mistakes JSONB DEFAULT '[]'::jsonb,
    psychology JSONB DEFAULT '{}'::jsonb,
    average_entry NUMERIC,
    average_exit NUMERIC,
    total_fees NUMERIC DEFAULT 0,
    gross_pnl NUMERIC,
    net_pnl NUMERIC
);

-- 3. Robust Safety Migration for Type Mismatches (UUID vs TEXT)
DO $$ 
BEGIN 
    -- Only attempt migration if the column exists and is still text
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='trades' AND column_name='account_id' AND data_type='text'
    ) THEN
        -- Step A: Drop constraint
        ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_account_id_fkey;
        
        -- Step B: Force drop the default value
        ALTER TABLE public.trades ALTER COLUMN account_id DROP DEFAULT;

        -- Step C: Clean the data. Set any non-uuid text to NULL
        UPDATE public.trades 
        SET account_id = NULL 
        WHERE account_id IS NOT NULL 
          AND account_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

        -- Step D: Cast the column to UUID
        ALTER TABLE public.trades 
        ALTER COLUMN account_id TYPE UUID 
        USING (account_id::UUID);

        -- Step E: Re-add the foreign key constraint
        ALTER TABLE public.trades
        ADD CONSTRAINT trades_account_id_fkey 
        FOREIGN KEY (account_id) 
        REFERENCES public.accounts(id) 
        ON DELETE SET NULL;
    END IF;

    -- Ensure missing JSONB and boolean columns exist (for old schemas)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='executions') THEN
        ALTER TABLE trades ADD COLUMN executions JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='psychology') THEN
        ALTER TABLE trades ADD COLUMN psychology JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='followed_plan') THEN
        ALTER TABLE trades ADD COLUMN followed_plan BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
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
END $$;

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON public.trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON public.trades(date DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);