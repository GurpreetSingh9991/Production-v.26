-- REPAIR & SETUP SCRIPT FOR PROFILES
-- This script ensures the table, columns, and triggers are correctly configured.

-- 1. Ensure Profiles Table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. MANDATORY REPAIR: Add missing columns if the table already existed without them
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='plan') THEN
        ALTER TABLE public.profiles ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='stripe_customer_id') THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='created_at') THEN
        ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Re-establish Policy (Clean slate)
DROP POLICY IF EXISTS "Users can read and update only their own profile" ON public.profiles;
CREATE POLICY "Users can read and update only their own profile" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- 5. Re-create Trigger Function with conflict handling (ON CONFLICT DO NOTHING)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, plan)
  VALUES (new.id, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Re-attach Trigger
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_profile();

-- 7. Ensure Index for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- 8. INITIAL DATA: Create profiles for existing users who don't have one yet
INSERT INTO public.profiles (id, plan)
SELECT id, 'free' FROM auth.users
ON CONFLICT (id) DO NOTHING;