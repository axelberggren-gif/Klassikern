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
  cycling_goal_km: 300,
  running_goal_km: 30,
  swimming_goal_km: 3,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as const;
