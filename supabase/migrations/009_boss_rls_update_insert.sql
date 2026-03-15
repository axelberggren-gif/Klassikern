-- ============================================================================
-- Migration 009: Add missing UPDATE/INSERT RLS policies for Boss tables
-- ============================================================================
-- The boss_encounters table was missing an UPDATE policy, so client-side
-- calls to update current_hp after an attack were silently blocked by RLS.
-- The boss_trophies table was missing an INSERT policy needed when a boss
-- is defeated.
-- The boss_encounters table was also missing an UPDATE policy for marking
-- encounters as defeated/failed.
-- ============================================================================

-- ============================================================================
-- BOSS ENCOUNTERS — UPDATE (group members can update HP and status)
-- ============================================================================

create policy boss_encounters_update_group
  on boss_encounters for update
  to authenticated
  using (group_id in (select get_my_group_ids()))
  with check (group_id in (select get_my_group_ids()));

-- ============================================================================
-- BOSS TROPHIES — INSERT (users can insert their own trophies)
-- ============================================================================

create policy boss_trophies_insert_own
  on boss_trophies for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================================================
-- Notify PostgREST to reload schema
-- ============================================================================
notify pgrst, 'reload schema';
