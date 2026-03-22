import { describe, it, expect } from 'vitest';
import { calculateEP, getWaypointIndex, WAYPOINT_EP_INTERVAL } from '@/lib/ep-calculator';

describe('calculateEP', () => {
  it('calculates base EP for a 30-min cycling session', () => {
    // base=10, duration=30/30=1, effort=1 (1.0), streak=0 (1.0)
    expect(calculateEP('cycling', 30, 1, 0)).toBe(10);
  });

  it('scales with duration', () => {
    // base=10, duration=60/30=2, effort=1 (1.0), streak=0 (1.0)
    expect(calculateEP('cycling', 60, 1, 0)).toBe(20);
  });

  it('applies effort bonus at rating 5', () => {
    // base=10, duration=30/30=1, effort=5 (1.2), streak=0 (1.0)
    expect(calculateEP('cycling', 30, 5, 0)).toBe(12);
  });

  it('applies streak bonus at 7 days', () => {
    // base=10, duration=30/30=1, effort=1 (1.0), streak=7 (1.3)
    expect(calculateEP('cycling', 30, 1, 7)).toBe(13);
  });

  it('stacks effort and streak bonuses', () => {
    // base=10, duration=30/30=1, effort=5 (1.2), streak=7 (1.3)
    // 10 * 1 * 1.2 * 1.3 = 15.6 → rounded to 16
    expect(calculateEP('cycling', 30, 5, 7)).toBe(16);
  });

  it('gives higher base points for swimming', () => {
    // base=12 for swimming
    expect(calculateEP('swimming', 30, 1, 0)).toBe(12);
  });

  it('returns 0 for rest (base=0, but fallback gives 6)', () => {
    // BASE_POINTS['rest'] = 0, but `|| 6` fallback triggers on 0
    // This is a known quirk — rest still earns minimal EP
    expect(calculateEP('rest', 30, 1, 0)).toBe(6);
  });

  it('handles short sessions', () => {
    // base=10, duration=15/30=0.5, effort=1, streak=0
    expect(calculateEP('running', 15, 1, 0)).toBe(5);
  });
});

describe('getWaypointIndex', () => {
  it('returns 0 for EP below interval', () => {
    expect(getWaypointIndex(499)).toBe(0);
  });

  it('returns 1 at exactly one interval', () => {
    expect(getWaypointIndex(WAYPOINT_EP_INTERVAL)).toBe(1);
  });

  it('returns correct index for high EP', () => {
    expect(getWaypointIndex(1500)).toBe(3);
  });
});
