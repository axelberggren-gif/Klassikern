'use client';

import { useRouter } from 'next/navigation';
import { Swords } from 'lucide-react';
import BossHPBar from './BossHPBar';
import WeaknessResistance from './WeaknessResistance';
import BossAttackLog from './BossAttackLog';
import { isLastStandWindow } from '@/lib/boss-engine';
import type { BossEncounterWithBoss, BossAttack, Profile } from '@/types/database';

interface BossCardProps {
  encounter: BossEncounterWithBoss | null;
  attacks: BossAttack[];
  members: Profile[];
}

export default function BossCard({ encounter, attacks, members }: BossCardProps) {
  const router = useRouter();

  if (!encounter) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center">
        <span className="text-4xl">⚔️</span>
        <p className="mt-3 text-sm font-semibold text-slate-200">Ingen aktiv boss</p>
        <p className="mt-1 text-xs text-slate-400">En ny boss dyker upp varje vecka</p>
      </div>
    );
  }

  const lastStand = isLastStandWindow(new Date(encounter.week_end));
  const boss = encounter.boss;

  return (
    <div
      className={`rounded-2xl border bg-slate-900 p-5 ${
        lastStand
          ? 'border-rose-500/50 animate-last-stand-border'
          : 'border-slate-700'
      }`}
    >
      {/* Boss identity */}
      <div className="flex items-start gap-4 mb-4">
        <span className="text-6xl leading-none">{boss.emoji}</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-50">{boss.name}</h2>
          <p className="mt-1 text-xs italic text-slate-400 line-clamp-2">
            {boss.lore}
          </p>
        </div>
      </div>

      {/* HP Bar */}
      <BossHPBar
        currentHp={encounter.current_hp}
        maxHp={encounter.max_hp}
        isLastStand={lastStand}
      />

      {/* Last Stand warning */}
      {lastStand && (
        <div className="mt-2 rounded-lg bg-rose-500/10 px-3 py-1.5 text-center">
          <span className="text-xs font-bold text-rose-500">
            LAST STAND — 2x skada!
          </span>
        </div>
      )}

      {/* Weakness / Resistance */}
      <div className="mt-3">
        <WeaknessResistance weakness={boss.weakness} resistance={boss.resistance} />
      </div>

      {/* Recent attacks */}
      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Senaste attacker
        </p>
        <BossAttackLog attacks={attacks} members={members} />
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push('/log')}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-lg transition-transform active:scale-[0.97]"
      >
        <Swords size={18} />
        Attackera!
      </button>
    </div>
  );
}
