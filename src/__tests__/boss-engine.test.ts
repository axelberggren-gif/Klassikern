import { describe, it, expect, vi } from 'vitest';
import {
  calculateBossDamage,
  scaleBossHP,
  getBossForWeek,
  isLastStandWindow,
  generateDefeatText,
  evaluateCritConditions,
  type CritContext,
} from '@/lib/boss-engine';
import type { BossDefinition, BossEncounter } from '@/types/database';

const makeBoss = (overrides?: Partial<BossDefinition>): BossDefinition => ({
  id: 1,
  name: 'Test Boss',
  description: 'A test boss',
  hp: 1000,
  weakness: 'running',
  resistance: 'swimming',
  crit_conditions: [],
  defeat_quotes: ['{killer} wins!'],
  sprite_key: 'test',
  tier: 1,
  ...overrides,
} as BossDefinition);

const makeEncounter = (overrides?: Partial<BossEncounter>): BossEncounter => ({
  id: 'enc-1',
  group_id: 'grp-1',
  boss_id: 1,
  max_hp: 1000,
  current_hp: 500,
  status: 'active',
  started_at: new Date().toISOString(),
  ...overrides,
} as BossEncounter);

const makeCritContext = (overrides?: Partial<CritContext>): CritContext => ({
  sessionTime: new Date(2026, 2, 22, 12, 0), // noon, Sunday
  sessionDurationMinutes: 30,
  userStreak: 0,
  todayAttackerCount: 1,
  isFirstAttackToday: false,
  ...overrides,
});

describe('calculateBossDamage', () => {
  it('applies weakness multiplier (1.5x)', () => {
    // Mock Math.random to prevent random crits
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = calculateBossDamage({
      epEarned: 10,
      sportType: 'running', // weakness
      boss: makeBoss(),
      encounter: makeEncounter(),
      todayAttackerCount: 1,
      critContext: makeCritContext(),
    });

    expect(result.damage).toBe(15);
    expect(result.isWeakness).toBe(true);
    expect(result.isResistance).toBe(false);

    vi.restoreAllMocks();
  });

  it('applies resistance multiplier (0.75x)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = calculateBossDamage({
      epEarned: 20,
      sportType: 'swimming', // resistance
      boss: makeBoss(),
      encounter: makeEncounter(),
      todayAttackerCount: 1,
      critContext: makeCritContext(),
    });

    expect(result.damage).toBe(15);
    expect(result.isResistance).toBe(true);

    vi.restoreAllMocks();
  });

  it('applies combo bonus with 3+ attackers', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = calculateBossDamage({
      epEarned: 10,
      sportType: 'cycling', // neutral
      boss: makeBoss(),
      encounter: makeEncounter(),
      todayAttackerCount: 3,
      critContext: makeCritContext(),
    });

    expect(result.damage).toBe(12); // 10 * 1.2

    vi.restoreAllMocks();
  });

  it('applies last stand multiplier when boss HP is low', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = calculateBossDamage({
      epEarned: 10,
      sportType: 'cycling',
      boss: makeBoss(),
      encounter: makeEncounter({ current_hp: 50, max_hp: 1000 }), // 5% HP
      todayAttackerCount: 1,
      critContext: makeCritContext(),
    });

    expect(result.damage).toBe(20); // 10 * 2.0
    expect(result.isLastStand).toBe(true);

    vi.restoreAllMocks();
  });
});

describe('evaluateCritConditions', () => {
  it('detects evening session (18-22)', () => {
    const result = evaluateCritConditions(
      [{ type: 'evening_session', description: 'Train in the evening' }],
      makeCritContext({ sessionTime: new Date(2026, 2, 22, 19, 0) })
    );
    expect(result).toBe(true);
  });

  it('detects weekend warrior', () => {
    // March 22, 2026 is a Sunday
    const result = evaluateCritConditions(
      [{ type: 'weekend_warrior', description: 'Train on weekends' }],
      makeCritContext({ sessionTime: new Date(2026, 2, 22, 12, 0) })
    );
    expect(result).toBe(true);
  });
});

describe('scaleBossHP', () => {
  it('scales for a group of 4 (baseline)', () => {
    expect(scaleBossHP(1000, 4)).toBe(1000);
  });

  it('scales for a group of 8', () => {
    expect(scaleBossHP(1000, 8)).toBe(2000);
  });

  it('scales for a group of 2', () => {
    expect(scaleBossHP(1000, 2)).toBe(500);
  });
});

describe('getBossForWeek', () => {
  it('returns boss 1 for week 1', () => {
    expect(getBossForWeek(1, 30)).toBe(1);
  });

  it('wraps around after all bosses used', () => {
    expect(getBossForWeek(31, 30)).toBe(1);
  });
});

describe('isLastStandWindow', () => {
  it('true when HP is 10% or below', () => {
    expect(isLastStandWindow(makeEncounter({ current_hp: 100, max_hp: 1000 }))).toBe(true);
  });

  it('false when HP is above 10%', () => {
    expect(isLastStandWindow(makeEncounter({ current_hp: 200, max_hp: 1000 }))).toBe(false);
  });

  it('false when HP is 0', () => {
    expect(isLastStandWindow(makeEncounter({ current_hp: 0, max_hp: 1000 }))).toBe(false);
  });
});

describe('generateDefeatText', () => {
  it('replaces {killer} placeholder', () => {
    const boss = makeBoss({ defeat_quotes: ['{killer} vann!'] });
    const text = generateDefeatText(boss, 'Anna', ['Anna', 'Erik']);
    expect(text).toBe('Anna vann!');
  });

  it('provides default text when no quotes', () => {
    const boss = makeBoss({ defeat_quotes: [] });
    const text = generateDefeatText(boss, 'Anna', ['Anna']);
    expect(text).toContain('Anna');
    expect(text).toContain('Test Boss');
  });
});
