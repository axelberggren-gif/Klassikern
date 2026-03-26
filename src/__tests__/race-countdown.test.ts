import { describe, expect, it } from 'vitest';
import { buildRaceCountdownCards, getDaysRemaining, getReadinessStatus } from '@/lib/race-countdown';
import type { Profile, Session } from '@/types/database';
import { TEST_PROFILE, TEST_USER_ID } from '@/lib/test-helpers';

function makeSession(partial: Partial<Session>): Session {
  return {
    id: partial.id || `session-${partial.user_id ?? TEST_USER_ID}-${partial.date ?? 'default'}`,
    user_id: partial.user_id || TEST_USER_ID,
    planned_session_id: partial.planned_session_id ?? null,
    sport_type: partial.sport_type || 'cycling',
    date: partial.date || '2026-03-01',
    duration_minutes: partial.duration_minutes ?? 30,
    distance_km: partial.distance_km ?? null,
    effort_rating: partial.effort_rating ?? '3',
    note: partial.note ?? null,
    ep_earned: partial.ep_earned ?? 10,
    is_bonus: partial.is_bonus ?? false,
    strava_activity_id: partial.strava_activity_id ?? null,
    photo_url: partial.photo_url ?? null,
    created_at: partial.created_at || '2026-03-01T00:00:00Z',
    updated_at: partial.updated_at || '2026-03-01T00:00:00Z',
  };
}

describe('getDaysRemaining', () => {
  it('returns positive days in future', () => {
    const days = getDaysRemaining(new Date('2026-06-13T00:00:00Z'), new Date('2026-06-10T00:00:00Z'));
    expect(days).toBe(3);
  });

  it('returns zero on same day', () => {
    const days = getDaysRemaining(new Date('2026-06-13T00:00:00Z'), new Date('2026-06-13T00:00:00Z'));
    expect(days).toBe(0);
  });
});

describe('getReadinessStatus', () => {
  it('maps ratio to on_track', () => {
    expect(getReadinessStatus(1)).toBe('on_track');
    expect(getReadinessStatus(1.2)).toBe('on_track');
  });

  it('maps ratio to behind', () => {
    expect(getReadinessStatus(0.7)).toBe('behind');
    expect(getReadinessStatus(0.95)).toBe('behind');
  });

  it('maps ratio to significantly_behind', () => {
    expect(getReadinessStatus(0.69)).toBe('significantly_behind');
    expect(getReadinessStatus(0.2)).toBe('significantly_behind');
  });
});

describe('buildRaceCountdownCards', () => {
  it('builds four race cards with profile dates', () => {
    const profile = TEST_PROFILE as unknown as Profile;
    const cards = buildRaceCountdownCards(profile, [], new Date('2026-03-01T00:00:00Z'));

    expect(cards).toHaveLength(4);
    expect(cards.map((c) => c.key)).toEqual(['vattern', 'vansbro', 'lidingo', 'vasaloppet']);
    expect(cards[0].date).toBe('2026-06-13');
    expect(cards[1].date).toBe('2026-07-04');
    expect(cards[2].date).toBe('2026-09-26');
    expect(cards[3].date).toBe('2027-03-07');
  });

  it('increases readiness when matching sessions are logged', () => {
    const profile = TEST_PROFILE as unknown as Profile;
    const today = new Date('2026-03-15T00:00:00Z');
    const sessions: Session[] = [
      makeSession({ sport_type: 'cycling', date: '2026-03-02', duration_minutes: 60 }),
      makeSession({ sport_type: 'cycling', date: '2026-03-09', duration_minutes: 75 }),
      makeSession({ sport_type: 'cycling', date: '2026-03-14', duration_minutes: 90 }),
    ];

    const cards = buildRaceCountdownCards(profile, sessions, today);
    const vattern = cards.find((c) => c.key === 'vattern');

    expect(vattern).toBeDefined();
    expect(vattern!.readinessPercent).toBeGreaterThan(0);
    expect(vattern!.planCompletionPercent).toBeGreaterThan(0);
  });
});
