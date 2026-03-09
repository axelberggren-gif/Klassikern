-- ============================================================================
-- Migration 007: RLS Policies for Boss Battle Tables
-- ============================================================================
-- Adds Row-Level Security policies for the boss battle tables created in
-- 006_boss_battles.sql.
--
-- Uses the SECURITY DEFINER helper function get_my_group_ids() from
-- 005_fix_rls_recursion.sql to avoid infinite recursion when checking
-- group membership.
--
-- Policy naming convention: {table}_{action}_{who}
-- ============================================================================

-- ============================================================================
-- Enable RLS on all boss tables
-- ============================================================================

alter table boss_definitions enable row level security;
alter table boss_encounters  enable row level security;
alter table boss_attacks     enable row level security;
alter table boss_trophies    enable row level security;

-- ============================================================================
-- BOSS DEFINITIONS
-- ============================================================================
-- Static reference data, readable by all authenticated users.
-- No insert/update/delete for users (managed by service role).

create policy boss_definitions_select_all
  on boss_definitions for select
  to authenticated
  using (auth.uid() is not null);

-- ============================================================================
-- BOSS ENCOUNTERS
-- ============================================================================
-- Group members can read encounters for their groups.
-- No direct user inserts (handled by backend / service role).

create policy boss_encounters_select_group
  on boss_encounters for select
  to authenticated
  using (group_id in (select get_my_group_ids()));

-- ============================================================================
-- BOSS ATTACKS
-- ============================================================================
-- Group members can read attacks for encounters in their groups.
-- Users can insert their own attacks (user_id = auth.uid()).

create policy boss_attacks_select_group
  on boss_attacks for select
  to authenticated
  using (
    encounter_id in (
      select id from boss_encounters
      where group_id in (select get_my_group_ids())
    )
  );

create policy boss_attacks_insert_own
  on boss_attacks for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================================================
-- BOSS TROPHIES
-- ============================================================================
-- Users can see their own trophies.

create policy boss_trophies_select_own
  on boss_trophies for select
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- Notify PostgREST to reload schema
-- ============================================================================
notify pgrst, 'reload schema';
