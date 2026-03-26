/**
 * Test mode helpers.
 *
 * When NEXT_PUBLIC_TEST_MODE=true, the middleware and auth hook
 * can bypass real Supabase auth and use a mock user. This allows
 * Claude (and CI) to verify that pages render without needing
 * real credentials.
 *
 * IMPORTANT: Only active when NEXT_PUBLIC_TEST_MODE is explicitly "true".
 * Never set this in production.
 */

export const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === 'true';

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export const TEST_PROFILE = {
  id: TEST_USER_ID,
  display_name: 'Test User',
  avatar_emoji: '🧪',
  email: 'test@klassikern.test',
  total_ep: 150,
  current_streak: 3,
  longest_streak: 7,
  goal_vr_hours: 9,
  goal_vansbro_minutes: 60,
  goal_lidingo_hours: 3,
  race_date_vattern: '2026-06-13',
  race_date_vansbro: '2026-07-04',
  race_date_lidingo: '2026-09-26',
  race_date_vasaloppet: '2027-03-07',
  streak_freezes_remaining: 1,
  notification_preferences: {
    session_logged: true,
    streak_milestone: true,
    streak_at_risk: true,
    streak_lost: true,
    boss_defeated: true,
    boss_killing_blow: true,
    boss_new: true,
    boss_weakness_hit: true,
    boss_low_hp: true,
    badge_unlocked: true,
    boss_trophy_earned: true,
    group_member_joined: true,
    group_member_left: true,
    teammate_session: true,
    leaderboard_overtaken: true,
    race_milestone: true,
    strava_sync_complete: true,
    strava_sync_failed: true,
    goal_updated: true,
  },
  cycling_goal_km: 300,
  running_goal_km: 30,
  swimming_goal_km: 3,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as const;

import type { Profile } from '@/types/database';

let testProfileState: Profile = TEST_PROFILE as unknown as Profile;

export function getTestProfile(): Profile {
  return testProfileState;
}

export function setTestProfile(next: Profile): void {
  testProfileState = next;
}
