import type { SportType, BossDefinition, BossEncounter, CritCondition } from '@/types/database';

const BASE_DAMAGE_MULTIPLIER = 3;
const WEAKNESS_MULTIPLIER = 1.5;
const RESISTANCE_MULTIPLIER = 0.75;
const CRIT_MULTIPLIER = 2.0;
const COMBO_THRESHOLD = 3;
const COMBO_BONUS = 1.2;
const LAST_STAND_THRESHOLD = 0.10;
const LAST_STAND_MULTIPLIER = 2.0;

// Small random crit chance as fallback (3%)
const RANDOM_CRIT_CHANCE = 0.03;

export interface CritContext {
  sessionTime: Date;
  sessionDurationMinutes: number;
  userStreak: number;
  todayAttackerCount: number;
  isFirstAttackToday: boolean;
}

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  isWeakness: boolean;
  isResistance: boolean;
  isLastStand: boolean;
}

/**
 * Evaluate whether a crit condition is met.
 */
function evaluateSingleCondition(condition: CritCondition, ctx: CritContext): boolean {
  switch (condition.type) {
    case 'evening_session': {
      const hour = ctx.sessionTime.getHours();
      return hour >= 18 && hour < 22;
    }
    case 'dawn_raid': {
      const hour = ctx.sessionTime.getHours();
      return hour < 6;
    }
    case 'long_session': {
      return ctx.sessionDurationMinutes >= condition.min_minutes;
    }
    case 'weekend_warrior': {
      const day = ctx.sessionTime.getDay();
      return day === 0 || day === 6;
    }
    case 'first_attack_of_day': {
      return ctx.isFirstAttackToday;
    }
    case 'streak': {
      return ctx.userStreak >= condition.min_days;
    }
    case 'group_sync': {
      return ctx.todayAttackerCount >= condition.min_same_day;
    }
    default:
      return false;
  }
}

/**
 * Check if any crit condition is met, or fall back to small random chance.
 */
export function evaluateCritConditions(
  conditions: CritCondition[],
  ctx: CritContext
): boolean {
  // Check deterministic conditions first
  for (const condition of conditions) {
    if (evaluateSingleCondition(condition, ctx)) {
      return true;
    }
  }
  // Small random fallback so crits aren't 100% predictable
  return Math.random() < RANDOM_CRIT_CHANCE;
}

export function calculateBossDamage(params: {
  epEarned: number;
  sportType: SportType;
  boss: BossDefinition;
  encounter: BossEncounter;
  todayAttackerCount: number;
  critContext: CritContext;
}): DamageResult {
  let damage = params.epEarned * BASE_DAMAGE_MULTIPLIER;
  let isWeakness = false;
  let isResistance = false;

  // Weakness/resistance modifiers
  if (params.boss.weakness === params.sportType) {
    damage *= WEAKNESS_MULTIPLIER;
    isWeakness = true;
  } else if (params.boss.resistance === params.sportType) {
    damage *= RESISTANCE_MULTIPLIER;
    isResistance = true;
  }

  // Smart crit system
  const isCritical = evaluateCritConditions(
    params.boss.crit_conditions ?? [],
    params.critContext
  );
  if (isCritical) {
    damage *= CRIT_MULTIPLIER;
  }

  // Combo bonus (3+ unique attackers today → +20%)
  if (params.todayAttackerCount >= COMBO_THRESHOLD) {
    damage *= COMBO_BONUS;
  }

  // Debuff modifier from previous failed boss
  const debuff = (params.encounter as Record<string, unknown>).debuff_modifier as number | undefined;
  if (debuff && debuff !== 1) {
    damage *= debuff;
  }

  // Last Stand (boss ≤10% HP → double damage)
  const isLastStand =
    params.encounter.current_hp <= params.encounter.max_hp * LAST_STAND_THRESHOLD;
  if (isLastStand) {
    damage *= LAST_STAND_MULTIPLIER;
  }

  return {
    damage: Math.round(damage),
    isCritical,
    isWeakness,
    isResistance,
    isLastStand,
  };
}

export function scaleBossHP(baseHp: number, groupSize: number): number {
  return Math.round(baseHp * (groupSize / 4));
}

export function getBossForWeek(weekNumber: number, totalBosses: number): number {
  return ((weekNumber - 1) % totalBosses) + 1;
}

export function isLastStandWindow(encounter: BossEncounter): boolean {
  return (
    encounter.current_hp <= encounter.max_hp * LAST_STAND_THRESHOLD &&
    encounter.current_hp > 0
  );
}

/**
 * Pick a random defeat quote and personalize it with player names.
 */
export function generateDefeatText(
  boss: BossDefinition,
  killerName: string,
  allMemberNames: string[]
): string {
  const quotes = boss.defeat_quotes ?? [];
  if (quotes.length === 0) {
    return `${boss.name} har besegrats av ${killerName}!`;
  }

  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  // Pick a random member that isn't the killer for the insult
  const otherMembers = allMemberNames.filter(
    (name) => name.toLowerCase() !== killerName.toLowerCase()
  );
  const randomMember =
    otherMembers.length > 0
      ? otherMembers[Math.floor(Math.random() * otherMembers.length)]
      : killerName;

  return quote
    .replace(/\{killer\}/g, killerName)
    .replace(/\{random_member\}/g, randomMember);
}
