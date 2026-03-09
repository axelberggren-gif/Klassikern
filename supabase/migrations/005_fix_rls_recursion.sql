-- ============================================================================
-- Migration 005: Fix RLS infinite recursion
-- ============================================================================
-- The group_members_select_same_group policy is self-referencing: it queries
-- group_members within its own USING clause, which triggers recursive policy
-- evaluation and PostgreSQL's "infinite recursion detected" error.
--
-- Fix: Create a SECURITY DEFINER helper function that bypasses RLS to look up
-- the current user's group IDs. Then rewrite all self-referencing policies to
-- use this function instead of direct subqueries on group_members.
--
-- Also scope group_members-referencing policies to TO authenticated to prevent
-- anon queries from triggering the join logic.
-- ============================================================================

-- 1. Helper function: returns the group IDs the current user belongs to.
--    SECURITY DEFINER bypasses RLS, breaking the recursive chain.
CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS SETOF uuid AS $$
  SELECT group_id FROM group_members WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Fix group_members self-referencing policy
DROP POLICY IF EXISTS group_members_select_same_group ON group_members;
CREATE POLICY group_members_select_same_group
  ON group_members FOR SELECT
  TO authenticated
  USING (group_id IN (SELECT get_my_group_ids()));

-- 3. Fix profiles policy that joins group_members
DROP POLICY IF EXISTS profiles_select_group_members ON profiles;
CREATE POLICY profiles_select_group_members
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT gm.user_id FROM group_members gm
      WHERE gm.group_id IN (SELECT get_my_group_ids())
    )
  );

-- 4. Fix sessions policy that joins group_members
DROP POLICY IF EXISTS sessions_select_group ON sessions;
CREATE POLICY sessions_select_group
  ON sessions FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT gm.user_id FROM group_members gm
      WHERE gm.group_id IN (SELECT get_my_group_ids())
    )
  );

-- 5. Fix user_badges policy that joins group_members
DROP POLICY IF EXISTS user_badges_select_group ON user_badges;
CREATE POLICY user_badges_select_group
  ON user_badges FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT gm.user_id FROM group_members gm
      WHERE gm.group_id IN (SELECT get_my_group_ids())
    )
  );

-- 6. Fix groups select policy
DROP POLICY IF EXISTS groups_select_member ON groups;
CREATE POLICY groups_select_member
  ON groups FOR SELECT
  TO authenticated
  USING (id IN (SELECT get_my_group_ids()));

-- 7. Fix groups update policy
DROP POLICY IF EXISTS groups_update_owner ON groups;
CREATE POLICY groups_update_owner
  ON groups FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 8. Fix group_members delete admin policy
DROP POLICY IF EXISTS group_members_delete_admin ON group_members;
CREATE POLICY group_members_delete_admin
  ON group_members FOR DELETE
  TO authenticated
  USING (group_id IN (
    SELECT group_id FROM group_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- 9. Fix remaining policies that reference group_members
DROP POLICY IF EXISTS planned_sessions_select_group ON planned_sessions;
CREATE POLICY planned_sessions_select_group
  ON planned_sessions FOR SELECT
  TO authenticated
  USING (group_id IN (SELECT get_my_group_ids()));

DROP POLICY IF EXISTS activity_feed_select_group ON activity_feed;
CREATE POLICY activity_feed_select_group
  ON activity_feed FOR SELECT
  TO authenticated
  USING (group_id IN (SELECT get_my_group_ids()));

DROP POLICY IF EXISTS weekly_challenges_select_group ON weekly_challenges;
CREATE POLICY weekly_challenges_select_group
  ON weekly_challenges FOR SELECT
  TO authenticated
  USING (group_id IN (SELECT get_my_group_ids()));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
