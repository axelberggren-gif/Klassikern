-- ============================================================================
-- Fix missing INSERT policy on user_badges
-- ============================================================================
-- The badge checker (badge-checker.ts) runs in the browser and uses the
-- anon/authenticated Supabase client. Without an INSERT policy, any attempt
-- to award a badge from the client returns a 403 RLS violation.
-- ============================================================================

create policy user_badges_insert_own
  on user_badges for insert
  with check (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
