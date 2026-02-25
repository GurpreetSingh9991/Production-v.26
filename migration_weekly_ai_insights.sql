-- ============================================================
-- TradeFlow Studio — Weekly AI Insights Migration
-- Run in Supabase SQL Editor after migration_security_fix.sql
-- ============================================================

-- Add insight caching columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_insight_content TEXT,
  ADD COLUMN IF NOT EXISTS ai_insight_week    TEXT,   -- stores ISO week key e.g. "2025-W08"
  ADD COLUMN IF NOT EXISTS ai_insight_updated TIMESTAMPTZ;

-- Allow users to update ONLY their own insight columns (not plan/stripe)
-- Drop old update policy first, recreate it with insight fields allowed
DROP POLICY IF EXISTS "Users can update their own non-billing profile fields" ON public.profiles;

CREATE POLICY "Users can update their own non-billing profile fields"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    -- plan and stripe_customer_id remain locked — only webhook can change these
    AND plan = (SELECT plan FROM public.profiles WHERE id = auth.uid())
    AND (stripe_customer_id IS NOT DISTINCT FROM (
        SELECT stripe_customer_id FROM public.profiles WHERE id = auth.uid()
    ))
    -- ai_insight_* fields ARE allowed to be updated by the user
);

-- Allow upsert (insert-or-replace) on profiles for ai_insight_* fields
-- The upsert from the frontend uses the anon key, so it hits this RLS.
-- We allow it since insight fields are NOT billing-sensitive.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);
