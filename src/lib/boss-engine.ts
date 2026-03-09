import type { SportType } from '@/types/database';

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  modifiers: string[];
}

export interface LokiModifier {
  name: string;
  description: string;
  effect: 'swap_weakness' | 'reduce_ep' | 'no_crits' | 'reverse_combo';
}

interface CalculateBossDamageParams {
  ep: number;
  sportType: SportType;
  bossWeakness: SportType;
  bossResistance: SportType;
  uniqueAttackersThisWeek: number;
  debuffModifier?: number;
}

export function calculateBossDamage({
  ep,
  sportType,
  bossWeakness,
  bossResistance,
  uniqueAttackersThisWeek,
  debuffModifier,
}: CalculateBossDamageParams): DamageResult {
  let damage = ep;
  const modifiers: string[] = [];

  if (sportType === bossWeakness) {
    damage *= 1.5;
    modifiers.push('weakness');
  } else if (sportType === bossResistance) {
    damage *= 0.75;
    modifiers.push('resistance');
  }

  const isCritical = Math.random() < 0.1;
  if (isCritical) {
    damage *= 2;
    modifiers.push('critical');
  }

  if (uniqueAttackersThisWeek >= 3) {
    damage *= 1.2;
    modifiers.push('combo');
  }

  if (debuffModifier !== undefined && debuffModifier !== 1) {
    damage *= debuffModifier;
    modifiers.push('debuff');
  }

  return {
    damage: Math.round(damage),
    isCritical,
    modifiers,
  };
}

export function scaleBossHP(baseHP: number, groupSize: number): number {
  return Math.round(baseHP * (1 + (groupSize - 1) * 0.4));
}

export function getBossForWeek(weekNumber: number): number {
  if (weekNumber <= 0) return 1;
  if (weekNumber > 30) return ((weekNumber - 1) % 30) + 1;
  return weekNumber;
}

export function isLastStandWindow(weekEnd: Date): boolean {
  const now = new Date();
  const msUntilEnd = weekEnd.getTime() - now.getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return msUntilEnd > 0 && msUntilEnd <= twentyFourHours;
}

const LOKI_MODIFIERS: LokiModifier[] = [
  {
    name: 'Spegelvänd svaghet',
    description: 'Bossens svaghet och resistans byter plats',
    effect: 'swap_weakness',
  },
  {
    name: 'EP-stöld',
    description: 'Loki stjäl 25% av dina EP innan skada beräknas',
    effect: 'reduce_ep',
  },
  {
    name: 'Inga kritiska träffar',
    description: 'Loki blockerar alla kritiska träffar denna vecka',
    effect: 'no_crits',
  },
  {
    name: 'Omvänd combo',
    description: 'Combo-bonus ger -10% istället för +20%',
    effect: 'reverse_combo',
  },
];

export function getLokiModifiers(): LokiModifier[] {
  const count = Math.random() < 0.5 ? 1 : 2;
  const shuffled = [...LOKI_MODIFIERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getDebuffForNextWeek(defeatedBossLevel: number): number {
  if (defeatedBossLevel === 24) return 0.75;
  if (defeatedBossLevel >= 25) return 0.85;
  if (defeatedBossLevel >= 20) return 0.9;
  if (defeatedBossLevel >= 10) return 0.95;
  return 1;
}
