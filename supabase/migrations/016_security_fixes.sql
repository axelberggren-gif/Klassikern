-- ============================================================================
-- Security fixes: restrict groups table access to authenticated users
-- ============================================================================
-- The original groups_select_by_invite_code policy used `using (true)` which
-- allowed anonymous (unauthenticated) users to read all groups, exposing
-- invite codes. This restricts it to authenticated users only.

drop policy if exists groups_select_by_invite_code on groups;

create policy groups_select_by_invite_code
  on groups for select
  to authenticated
  using (true);
