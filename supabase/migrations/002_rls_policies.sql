-- ============================================================================
-- Klassikern Webapp - Row Level Security (RLS) Policies
-- ============================================================================
-- This migration enables RLS on all tables and defines access policies.
--
-- Policy naming convention: {table}_{action}_{who}
--   e.g. profiles_select_own  = user can SELECT their own profile
--        sessions_select_group = user can SELECT sessions for group members
-- ============================================================================

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================

alter table profiles           enable row level security;
alter table groups             enable row level security;
alter table group_members      enable row level security;
alter table planned_sessions   enable row level security;
alter table sessions           enable row level security;
alter table badges             enable row level security;
alter table user_badges        enable row level security;
alter table activity_feed      enable row level security;
alter table feed_reactions     enable row level security;
alter table weekly_challenges  enable row level security;
alter table expedition_waypoints enable row level security;

-- ============================================================================
-- PROFILES
-- ============================================================================
-- Users can read and update their own profile.
-- Users can read profiles of people in their groups (for leaderboard, feed).

create policy profiles_select_own
  on profiles for select
  using (auth.uid() = id);

create policy profiles_select_group_members
  on profiles for select
  using (
    id in (
      select gm2.user_id
      from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
    )
  );

create policy profiles_update_own
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insert is handled by the trigger on auth.users, not by the user directly.
-- No delete policy: users cannot delete their profile (handled via auth cascade).

-- ============================================================================
-- GROUPS
-- ============================================================================
-- Users can read groups they belong to.
-- Any authenticated user can create a group.
-- Only group owners can update a group.
-- Groups can be looked up by invite_code for joining.

create policy groups_select_member
  on groups for select
  using (
    id in (
      select group_id from group_members where user_id = auth.uid()
    )
  );

-- Allow reading any group by invite code (for join flow).
-- This is safe because the invite code is the secret, and the group row
-- itself only contains the name and code.
create policy groups_select_by_invite_code
  on groups for select
  using (true);

create policy groups_insert_authenticated
  on groups for insert
  with check (auth.uid() is not null);

create policy groups_update_owner
  on groups for update
  using (
    id in (
      select group_id from group_members
      where user_id = auth.uid() and role = 'owner'
    )
  )
  with check (
    id in (
      select group_id from group_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ============================================================================
-- GROUP MEMBERS
-- ============================================================================
-- Users can see members of groups they belong to.
-- Users can insert themselves into a group (join).
-- Users can delete their own membership (leave).

create policy group_members_select_same_group
  on group_members for select
  using (
    group_id in (
      select group_id from group_members where user_id = auth.uid()
    )
  );

create policy group_members_insert_self
  on group_members for insert
  with check (auth.uid() = user_id);

create policy group_members_delete_self
  on group_members for delete
  using (auth.uid() = user_id);

-- Owners/admins can remove other members
create policy group_members_delete_admin
  on group_members for delete
  using (
    group_id in (
      select group_id from group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================================
-- PLANNED SESSIONS
-- ============================================================================
-- Users can read planned sessions for groups they belong to.
-- Only group owners/admins can manage planned sessions.

create policy planned_sessions_select_group
  on planned_sessions for select
  using (
    group_id in (
      select group_id from group_members where user_id = auth.uid()
    )
  );

create policy planned_sessions_insert_admin
  on planned_sessions for insert
  with check (
    group_id in (
      select group_id from group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy planned_sessions_update_admin
  on planned_sessions for update
  using (
    group_id in (
      select group_id from group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy planned_sessions_delete_admin
  on planned_sessions for delete
  using (
    group_id in (
      select group_id from group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================================
-- SESSIONS
-- ============================================================================
-- Users can CRUD their own sessions.
-- Users can read sessions from members of the same group.

create policy sessions_select_own
  on sessions for select
  using (auth.uid() = user_id);

create policy sessions_select_group
  on sessions for select
  using (
    user_id in (
      select gm2.user_id
      from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
    )
  );

create policy sessions_insert_own
  on sessions for insert
  with check (auth.uid() = user_id);

create policy sessions_update_own
  on sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy sessions_delete_own
  on sessions for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- BADGES
-- ============================================================================
-- Badge definitions are readable by all authenticated users.

create policy badges_select_all
  on badges for select
  using (auth.uid() is not null);

-- Only service role can manage badge definitions (no insert/update/delete for users).

-- ============================================================================
-- USER BADGES
-- ============================================================================
-- Users can read their own badges.
-- Group members can see each other's badges (for profiles, feed).

create policy user_badges_select_own
  on user_badges for select
  using (auth.uid() = user_id);

create policy user_badges_select_group
  on user_badges for select
  using (
    user_id in (
      select gm2.user_id
      from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
    )
  );

-- Badge awarding is done server-side (service role), not by users directly.

-- ============================================================================
-- ACTIVITY FEED
-- ============================================================================
-- Users can read feed items for groups they belong to.
-- Users can create feed items (as themselves, in their groups).

create policy activity_feed_select_group
  on activity_feed for select
  using (
    group_id in (
      select group_id from group_members where user_id = auth.uid()
    )
  );

create policy activity_feed_insert_own
  on activity_feed for insert
  with check (
    auth.uid() = user_id
    and group_id in (
      select group_id from group_members where user_id = auth.uid()
    )
  );

-- ============================================================================
-- FEED REACTIONS
-- ============================================================================
-- Users can read reactions on feed items they can see.
-- Users can add/remove their own reactions.

create policy feed_reactions_select_group
  on feed_reactions for select
  using (
    feed_item_id in (
      select af.id from activity_feed af
      join group_members gm on af.group_id = gm.group_id
      where gm.user_id = auth.uid()
    )
  );

create policy feed_reactions_insert_own
  on feed_reactions for insert
  with check (auth.uid() = user_id);

create policy feed_reactions_delete_own
  on feed_reactions for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- WEEKLY CHALLENGES
-- ============================================================================
-- Users can read challenges for their groups.
-- Only admins/owners can manage challenges.

create policy weekly_challenges_select_group
  on weekly_challenges for select
  using (
    group_id in (
      select group_id from group_members where user_id = auth.uid()
    )
  );

create policy weekly_challenges_insert_admin
  on weekly_challenges for insert
  with check (
    group_id in (
      select group_id from group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy weekly_challenges_update_admin
  on weekly_challenges for update
  using (
    group_id in (
      select group_id from group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================================
-- EXPEDITION WAYPOINTS
-- ============================================================================
-- Static reference data, readable by all authenticated users.

create policy expedition_waypoints_select_all
  on expedition_waypoints for select
  using (auth.uid() is not null);
