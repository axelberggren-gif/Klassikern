'use client';

import type { BossAttack, Profile } from '@/types/database';

interface BossAttackLogProps {
  attacks: BossAttack[];
  members: Profile[];
  maxItems?: number;
}

export default function BossAttackLog({ attacks, members, maxItems = 5 }: BossAttackLogProps) {
  const displayAttacks = attacks.slice(-maxItems).reverse();

  if (displayAttacks.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic">Ingen har attackerat ännu...</p>
    );
  }

  const nameMap = new Map<string, string>();
  for (const m of members) {
    nameMap.set(m.id, m.display_name);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {displayAttacks.map((attack) => (
        <div
          key={attack.id}
          className={`flex items-center justify-between text-sm ${
            attack.is_critical ? 'animate-crit-flash' : ''
          }`}
        >
          <span className="text-slate-200 truncate">
            {nameMap.get(attack.user_id) || 'Okänd'}
          </span>
          <span className={`font-bold tabular-nums ${
            attack.is_critical ? 'text-violet-500' : 'text-rose-500'
          }`}>
            {attack.damage} DMG
            {attack.is_critical && ' KRIT!'}
          </span>
        </div>
      ))}
    </div>
  );
}
