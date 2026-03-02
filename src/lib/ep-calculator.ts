import type { SportType, EffortRating } from '@/types/database';

const BASE_POINTS: Record<SportType, number> = {
  cycling: 10,
  running: 10,
  swimming: 12,
  hiit: 8,
  rest: 0,
  other: 6,
};

const EFFORT_BONUS: Record<EffortRating, number> = {
  1: 1.0,
  2: 1.0,
  3: 1.1,
  4: 1.15,
  5: 1.2,
};

function getStreakBonus(streakDays: number): number {
  if (streakDays >= 7) return 1.3;
  if (streakDays >= 5) return 1.2;
  if (streakDays >= 3) return 1.1;
  return 1.0;
}

export function calculateEP(
  sportType: SportType,
  durationMinutes: number,
  effortRating: EffortRating,
  currentStreak: number
): number {
  const base = BASE_POINTS[sportType] || 6;
  const durationMultiplier = durationMinutes / 30;
  const effortBonus = EFFORT_BONUS[effortRating];
  const streakBonus = getStreakBonus(currentStreak);

  const ep = base * durationMultiplier * effortBonus * streakBonus;
  return Math.round(ep);
}

// EP thresholds for expedition waypoints
export const WAYPOINT_EP_INTERVAL = 500;

export function getWaypointIndex(totalEP: number): number {
  return Math.floor(totalEP / WAYPOINT_EP_INTERVAL);
}
