-- 014: Add notification preferences to profiles
-- Stores per-user notification toggles as JSONB

ALTER TABLE profiles
ADD COLUMN notification_preferences jsonb NOT NULL DEFAULT '{
  "session_logged": true,
  "streak_milestone": true,
  "streak_at_risk": true,
  "streak_lost": true,
  "boss_defeated": true,
  "boss_killing_blow": true,
  "boss_new": true,
  "boss_weakness_hit": true,
  "boss_low_hp": true,
  "badge_unlocked": true,
  "boss_trophy_earned": true,
  "group_member_joined": true,
  "group_member_left": true,
  "teammate_session": true,
  "leaderboard_overtaken": true,
  "race_milestone": true,
  "strava_sync_complete": true,
  "strava_sync_failed": true,
  "goal_updated": true
}'::jsonb;

-- Notify PostgREST of schema change
NOTIFY pgrst, 'reload schema';
