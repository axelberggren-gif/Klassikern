-- ============================================================================
-- Reset App Data for Fresh Start
-- ============================================================================
-- Clears all user-generated data (training sessions, boss battles, feed,
-- badges earned, strava connections) and resets profile stats to defaults.
-- Preserves: user accounts, groups, badge/boss/waypoint definitions.
-- ============================================================================

-- 1. Boss system (child tables first due to FK constraints)
DELETE FROM boss_trophies;
DELETE FROM boss_attacks;
DELETE FROM boss_encounters;

-- 2. Activity feed
DELETE FROM feed_reactions;
DELETE FROM activity_feed;

-- 3. Training data
DELETE FROM sessions;

-- 4. Planning & challenges
DELETE FROM planned_sessions;
DELETE FROM weekly_challenges;

-- 5. User achievements
DELETE FROM user_badges;

-- 6. Strava connections
DELETE FROM strava_connections;

-- 7. Reset profile stats and goals to defaults
UPDATE profiles SET
  total_ep = 0,
  current_streak = 0,
  longest_streak = 0,
  streak_freezes_remaining = 1,
  goal_vr_hours = 9,
  goal_vansbro_minutes = 60,
  goal_lidingo_hours = 3;
