import type { SportType, BossDefinition, BossEncounter } from '@/types/database';

const WEAKNESS_MULTIPLIER = 1.5;
const RESISTANCE_MULTIPLIER = 0.75;
const CRIT_CHANCE = 0.10;
const CRIT_MULTIPLIER = 2.0;
const COMBO_THRESHOLD = 3;
const COMBO_BONUS = 1.2;
const LAST_STAND_THRESHOLD = 0.10;
const LAST_STAND_MULTIPLIER = 2.0;

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  isWeakness: boolean;
  isResistance: boolean;
  isLastStand: boolean;
}

export function calculateBossDamage(params: {
  epEarned: number;
  sportType: SportType;
  boss: BossDefinition;
  encounter: BossEncounter;
  todayAttackerCount: number;
}): DamageResult {
  let damage = params.epEarned;
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

  // Crit chance (10% → 2x damage)
  const isCritical = Math.random() < CRIT_CHANCE;
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
