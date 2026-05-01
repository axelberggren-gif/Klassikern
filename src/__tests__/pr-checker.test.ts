import { describe, it, expect } from 'vitest';
import { detectPersonalRecords, computeAllTimeRecords } from '@/lib/pr-checker';
import type { Session } from '@/types/database';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    user_id: 'user-1',
    planned_session_id: null,
    sport_type: 'running',
    date: '2026-03-20',
    duration_minutes: 30,
    distance_km: 5,
    effort_rating: 3,
    note: null,
    ep_earned: 15,
    is_bonus: false,
    photo_urls: [],
    strava_activity_id: null,
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-20T10:00:00Z',
    ...overrides,
  };
}

describe('detectPersonalRecords', () => {
  it('detects all PRs when no previous sessions exist', () => {
    const newSession = makeSession({ id: 'new' });
    const prs = detectPersonalRecords(newSession, []);

    expect(prs.length).toBe(3); // highest_ep, longest_distance, fastest_pace
    expect(prs.map((p) => p.category)).toContain('highest_ep');
    expect(prs.map((p) => p.category)).toContain('longest_distance');
    expect(prs.map((p) => p.category)).toContain('fastest_pace');
    // All should have null previousBest
    for (const pr of prs) {
      expect(pr.previousBest).toBeNull();
    }
  });

  it('detects new EP record when beating previous best', () => {
    const newSession = makeSession({ id: 'new', ep_earned: 25 });
    const previous = [makeSession({ id: 'old', ep_earned: 20 })];

    const prs = detectPersonalRecords(newSession, previous);
    const epPR = prs.find((p) => p.category === 'highest_ep');

    expect(epPR).toBeDefined();
    expect(epPR!.value).toBe(25);
    expect(epPR!.previousBest).toBe(20);
  });

  it('does NOT detect EP record when below previous best', () => {
    const newSession = makeSession({ id: 'new', ep_earned: 10 });
    const previous = [makeSession({ id: 'old', ep_earned: 20 })];

    const prs = detectPersonalRecords(newSession, previous);
    const epPR = prs.find((p) => p.category === 'highest_ep');

    expect(epPR).toBeUndefined();
  });

  it('detects distance record for running', () => {
    const newSession = makeSession({ id: 'new', distance_km: 15 });
    const previous = [makeSession({ id: 'old', distance_km: 10 })];

    const prs = detectPersonalRecords(newSession, previous);
    const distPR = prs.find((p) => p.category === 'longest_distance');

    expect(distPR).toBeDefined();
    expect(distPR!.value).toBe(15);
    expect(distPR!.previousBest).toBe(10);
  });

  it('detects fastest pace for running', () => {
    // 30 min / 10 km = 3 min/km (new, faster)
    const newSession = makeSession({ id: 'new', duration_minutes: 30, distance_km: 10 });
    // 30 min / 5 km = 6 min/km (old, slower)
    const previous = [makeSession({ id: 'old', duration_minutes: 30, distance_km: 5 })];

    const prs = detectPersonalRecords(newSession, previous);
    const pacePR = prs.find((p) => p.category === 'fastest_pace');

    expect(pacePR).toBeDefined();
    expect(pacePR!.value).toBe(3); // 30/10 = 3 min/km
    expect(pacePR!.previousBest).toBe(6); // 30/5 = 6 min/km
  });

  it('excludes the new session itself from comparison', () => {
    const newSession = makeSession({ id: 'sess-1', ep_earned: 15 });
    // Previous list includes the same session (as it would after logSession fetches all)
    const previous = [newSession];

    const prs = detectPersonalRecords(newSession, previous);
    const epPR = prs.find((p) => p.category === 'highest_ep');

    // Should still detect as PR since there's no *other* session to compare against
    expect(epPR).toBeDefined();
    expect(epPR!.previousBest).toBeNull();
  });

  it('does not check distance PRs for hiit sport', () => {
    const newSession = makeSession({ id: 'new', sport_type: 'hiit', distance_km: null });
    const prs = detectPersonalRecords(newSession, []);

    expect(prs.length).toBe(1); // only highest_ep
    expect(prs[0].category).toBe('highest_ep');
  });

  it('handles swimming pace (min/100m)', () => {
    // 20 min / (1000m / 100) = 2 min/100m
    const newSession = makeSession({
      id: 'new',
      sport_type: 'swimming',
      duration_minutes: 20,
      distance_km: 1000, // meters for swimming
    });
    const prs = detectPersonalRecords(newSession, []);
    const pacePR = prs.find((p) => p.category === 'fastest_pace');

    expect(pacePR).toBeDefined();
    expect(pacePR!.value).toBe(2); // 20 / (1000/100) = 2
    expect(pacePR!.formattedValue).toBe('2:00 /100m');
  });
});

describe('computeAllTimeRecords', () => {
  it('returns records grouped by sport type', () => {
    const sessions = [
      makeSession({ sport_type: 'running', ep_earned: 20 }),
      makeSession({ sport_type: 'cycling', ep_earned: 15, distance_km: 30 }),
    ];

    const records = computeAllTimeRecords(sessions);

    expect(records.length).toBe(2);
    expect(records.map((r) => r.sportType)).toContain('running');
    expect(records.map((r) => r.sportType)).toContain('cycling');
  });

  it('skips sports with no sessions', () => {
    const sessions = [makeSession({ sport_type: 'running' })];
    const records = computeAllTimeRecords(sessions);

    expect(records.length).toBe(1);
    expect(records[0].sportType).toBe('running');
  });

  it('correctly identifies best EP per sport', () => {
    const sessions = [
      makeSession({ id: '1', sport_type: 'running', ep_earned: 10, date: '2026-03-01' }),
      makeSession({ id: '2', sport_type: 'running', ep_earned: 25, date: '2026-03-10' }),
      makeSession({ id: '3', sport_type: 'running', ep_earned: 15, date: '2026-03-15' }),
    ];

    const records = computeAllTimeRecords(sessions);
    const running = records.find((r) => r.sportType === 'running')!;

    expect(running.bestEP!.value).toBe(25);
    expect(running.bestEP!.date).toBe('2026-03-10');
  });

  it('computes longest distance and fastest pace for distance sports', () => {
    const sessions = [
      makeSession({ id: '1', sport_type: 'running', duration_minutes: 60, distance_km: 10, date: '2026-03-01' }),
      makeSession({ id: '2', sport_type: 'running', duration_minutes: 30, distance_km: 8, date: '2026-03-05' }),
    ];

    const records = computeAllTimeRecords(sessions);
    const running = records.find((r) => r.sportType === 'running')!;

    expect(running.longestDistance!.value).toBe(10);
    // Fastest pace: 30/8 = 3.75 min/km vs 60/10 = 6 min/km → 3.75 wins
    expect(running.fastestPace!.value).toBe(3.75);
    expect(running.fastestPace!.date).toBe('2026-03-05');
  });

  it('does not compute distance/pace records for hiit', () => {
    const sessions = [
      makeSession({ id: '1', sport_type: 'hiit', distance_km: null, ep_earned: 30 }),
    ];

    const records = computeAllTimeRecords(sessions);
    const hiit = records.find((r) => r.sportType === 'hiit')!;

    expect(hiit.longestDistance).toBeNull();
    expect(hiit.fastestPace).toBeNull();
    expect(hiit.bestEP!.value).toBe(30);
  });
});
