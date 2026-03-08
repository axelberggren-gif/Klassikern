'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Swords, ChevronRight } from 'lucide-react';
import { isLastStandWindow } from '@/lib/boss-engine';
import { SPORT_CONFIG } from '@/lib/sport-config';
import { getBossAttacks } from '@/lib/store';
import type { BossEncounterWithBoss, BossAttack } from '@/types/database';

interface BossCardProps {
  encounter: BossEncounterWithBoss;
  currentUserId: string;
}

function getTierName(level: number): string {
  if (level <= 5) return 'Skogsväsen';
  if (level <= 10) return 'Bergstroll';
  if (level <= 15) return 'Havsväsen';
  if (level <= 20) return 'Jotnar';
  if (level <= 25) return 'Drömväsen';
  return 'Ragnarök';
}

function getTimeRemaining(weekEnd: string): { days: number; hours: number } {
  const msLeft = Math.max(0, new Date(weekEnd).getTime() - Date.now());
  return {
    days: Math.floor(msLeft / (1000 * 60 * 60 * 24)),
    hours: Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
  };
}

export default function BossCard({ encounter, currentUserId }: BossCardProps) {
  const [attacks, setAttacks] = useState<BossAttack[]>([]);

  useEffect(() => {
    getBossAttacks(encounter.id).then(setAttacks);
  }, [encounter.id]);

  const hpPercent = encounter.max_hp > 0
    ? Math.round((encounter.current_hp / encounter.max_hp) * 100)
    : 0;

  const lastStand = isLastStandWindow(new Date(encounter.week_end));
  const { days, hours } = getTimeRemaining(encounter.week_end);
  const tierName = getTierName(encounter.boss.level);

  // Personal damage
  const myDamage = attacks
    .filter((a) => a.user_id === currentUserId)
    .reduce((sum, a) => sum + a.damage, 0);
  const myAttackCount = attacks.filter((a) => a.user_id === currentUserId).length;

  // Recent 3 attacks
  const recentAttacks = [...attacks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  // HP bar color
  const hpBarColor = hpPercent > 50
    ? 'from-red-600 to-orange-500'
    : hpPercent > 20
    ? 'from-orange-500 to-amber-400'
    : 'from-red-500 to-red-400';

  return (
    <Link href="/group?tab=boss" className="block">
      <div
        className={`rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 shadow-lg p-4 relative overflow-hidden ${
          lastStand ? 'ring-2 ring-red-500/60' : 'border border-slate-700'
        }`}
      >
        {/* Subtle glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-500/10 to-transparent rounded-bl-full pointer-events-none" />

        {/* Top row: Level badge + tier + Last Stand + countdown */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-300 tracking-wide uppercase">
              Lvl {encounter.boss.level}
            </span>
            <span className="text-[10px] font-medium text-slate-400">{tierName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {lastStand && (
              <span className="inline-flex items-center rounded-full bg-red-500/25 border border-red-500/40 px-2 py-0.5 text-[9px] font-bold text-red-300 animate-pulse">
                🔥 Last Stand
              </span>
            )}
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock size={10} />
              <span>{days > 0 ? `${days}d ${hours}h` : `${hours}h`}</span>
            </div>
          </div>
        </div>

        {/* Boss emoji + name + HP */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-shrink-0">
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)', transform: 'scale(1.4)' }}
            />
            <span
              className="relative text-4xl leading-none block"
              style={hpPercent < 20 ? { animation: 'boss-glow 2s ease-in-out infinite' } : undefined}
            >
              {encounter.boss.emoji}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white truncate">{encounter.boss.name}</h3>
            {/* HP Bar */}
            <div className="mt-1.5">
              <div className="h-3 rounded-full bg-slate-700/80 overflow-hidden relative">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${hpBarColor} transition-all duration-700`}
                  style={{
                    width: `${hpPercent}%`,
                    ...(hpPercent < 20 ? { animation: 'boss-hp-pulse 1.5s ease-in-out infinite' } : {}),
                  }}
                />
                <span
                  className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
                >
                  {encounter.current_hp} / {encounter.max_hp}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Weakness / Resistance hints */}
        {(encounter.boss.weakness || encounter.boss.resistance) && (
          <div className="flex gap-2 mb-3">
            {encounter.boss.weakness && (
              <div className="flex items-center gap-1 rounded-md bg-green-500/15 border border-green-500/25 px-2 py-1">
                <span className="text-xs">{SPORT_CONFIG[encounter.boss.weakness]?.icon}</span>
                <span className="text-[10px] font-semibold text-green-400">Svaghet</span>
              </div>
            )}
            {encounter.boss.resistance && (
              <div className="flex items-center gap-1 rounded-md bg-red-500/15 border border-red-500/25 px-2 py-1">
                <span className="text-xs">{SPORT_CONFIG[encounter.boss.resistance]?.icon}</span>
                <span className="text-[10px] font-semibold text-red-400">Resistans</span>
              </div>
            )}
          </div>
        )}

        {/* Personal contribution + recent attacks */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* My damage */}
            {myAttackCount > 0 ? (
              <div className="flex items-center gap-1.5">
                <Swords size={12} className="text-orange-400" />
                <span className="text-[11px] font-semibold text-orange-300">{myDamage} dmg</span>
                <span className="text-[10px] text-slate-500">({myAttackCount} attacker)</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 italic">Ingen attack ännu — logga ett pass!</span>
            )}
          </div>

          {/* Recent attack avatars */}
          {recentAttacks.length > 0 && (
            <div className="flex -space-x-1.5">
              {recentAttacks.map((atk) => (
                <div
                  key={atk.id}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 border border-slate-500 text-[8px] font-bold text-slate-200"
                  title={`${atk.damage} dmg`}
                >
                  {SPORT_CONFIG[atk.sport_type]?.icon || '⚡'}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tap to see more indicator */}
        <div className="flex items-center justify-center mt-2 gap-1">
          <span className="text-[9px] text-slate-500">Tryck för detaljer</span>
          <ChevronRight size={10} className="text-slate-500" />
        </div>
      </div>
    </Link>
  );
}
