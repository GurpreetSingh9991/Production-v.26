-- ============================================================
-- TradeFlow Studio — Security Migration
-- Run this if you already ran setup.sql / full_setup.sql before.
-- This patches the profiles RLS to prevent self-upgrading.
-- ============================================================

-- Drop the old overly-permissive policy
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;

-- READ: users can see their own profile
CREATE POLICY "Users can read their own profile"
ON public.profiles FOR SELECT USING (auth.uid() = id);

-- INSERT: allow client insert for edge cases (trigger handles normal signup)
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- UPDATE: users can only update non-billing fields
-- plan and stripe_customer_id are LOCKED — only service role (webhook) can change them
CREATE POLICY "Users can update their own non-billing profile fields"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    AND plan = (SELECT plan FROM public.profiles WHERE id = auth.uid())
    AND (stripe_customer_id IS NOT DISTINCT FROM (SELECT stripe_customer_id FROM public.profiles WHERE id = auth.uid()))
);
