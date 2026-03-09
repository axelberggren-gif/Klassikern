'use client';

import { useState } from 'react';
import { Swords, Zap, Clock } from 'lucide-react';
import { isLastStandWindow } from '@/lib/boss-engine';
import { SPORT_CONFIG } from '@/lib/sport-config';
import type { Profile, BossEncounterWithBoss, BossAttack } from '@/types/database';

function getMedalEmoji(index: number): string {
  if (index === 0) return '\u{1F947}';
  if (index === 1) return '\u{1F948}';
  if (index === 2) return '\u{1F949}';
  return `${index + 1}.`;
}

interface BossBattleTabProps {
  encounter: BossEncounterWithBoss | null;
  attacks: BossAttack[];
  history: BossEncounterWithBoss[];
  members: Profile[];
}

export default function BossBattleTab({ encounter, attacks, history, members }: BossBattleTabProps) {
  const [showHistory, setShowHistory] = useState(false);

  if (!encounter) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-8 text-center">
        <p className="text-5xl mb-3">{'\u{1F634}'}{'\u{1F409}'}</p>
        <h3 className="text-base font-semibold text-slate-200 mb-1">Ingen aktiv boss just nu</h3>
        <p className="text-sm text-slate-400">En ny boss dyker upp i början av nästa vecka!</p>
      </div>
    );
  }

  const hpPercent = encounter.max_hp > 0
    ? Math.round((encounter.current_hp / encounter.max_hp) * 100)
    : 0;

  const lastStand = isLastStandWindow(new Date(encounter.week_end));

  // Attack leaderboard: group by user, sum damage
  const damageByUser: Record<string, { damage: number; attacks: number; crits: number }> = {};
  for (const atk of attacks) {
    if (!damageByUser[atk.user_id]) {
      damageByUser[atk.user_id] = { damage: 0, attacks: 0, crits: 0 };
    }
    damageByUser[atk.user_id].damage += atk.damage;
    damageByUser[atk.user_id].attacks += 1;
    if (atk.is_critical) damageByUser[atk.user_id].crits += 1;
  }

  const attackLeaderboard = Object.entries(damageByUser)
    .map(([userId, stats]) => {
      const member = members.find((m) => m.id === userId);
      return { userId, displayName: member?.display_name || 'Okänd', ...stats };
    })
    .sort((a, b) => b.damage - a.damage);

  // Attack timeline: most recent first, max 10
  const recentAttacks = [...attacks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const bossLevel = encounter.boss.level;
  const tierName = bossLevel <= 5 ? 'Skogsväsen'
    : bossLevel <= 10 ? 'Bergstroll'
    : bossLevel <= 15 ? 'Havsväsen'
    : bossLevel <= 20 ? 'Jotnar'
    : bossLevel <= 25 ? 'Drömväsen'
    : 'Ragnarök';

  const now = new Date();
  const weekEnd = new Date(encounter.week_end);
  const msLeft = Math.max(0, weekEnd.getTime() - now.getTime());
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const cardBorder = hpPercent < 20 ? 'border-2 border-red-500' : 'border border-slate-700';
  const cardBg = hpPercent > 50
    ? 'bg-gradient-to-br from-slate-900 to-slate-800'
    : hpPercent > 20
    ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950'
    : 'bg-gradient-to-br from-slate-900 via-red-950 to-slate-800';

  return (
    <div className="flex flex-col gap-4">
      {/* Active Boss Card */}
      <div
        className={`rounded-2xl ${cardBg} ${cardBorder} shadow-lg p-5 relative overflow-hidden`}
        style={hpPercent < 20 ? { animation: 'boss-pulse-border 2s ease-in-out infinite' } : undefined}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/10 to-transparent rounded-bl-full pointer-events-none" />

        {/* Tier & Level Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-red-500/20 border border-red-500/30 px-2.5 py-1 text-[11px] font-bold text-red-300 tracking-wide uppercase">
              Lvl {bossLevel}
            </span>
            <span className="inline-flex items-center rounded-md bg-slate-700/60 border border-slate-600/50 px-2.5 py-1 text-[11px] font-semibold text-slate-300 tracking-wide">
              {tierName}
            </span>
          </div>
          {lastStand && (
            <span className="inline-flex items-center rounded-full bg-red-500/25 border border-red-500/40 px-2.5 py-1 text-[10px] font-bold text-red-300 animate-pulse whitespace-nowrap">
              {'\u{1F525}'} Last Stand!
            </span>
          )}
        </div>

        {/* Boss Emoji + Name + Lore */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.35) 0%, transparent 70%)', transform: 'scale(1.5)' }}
            />
            <span
              className="relative text-7xl leading-none block"
              style={{ animation: 'boss-glow 3s ease-in-out infinite' }}
            >
              {encounter.boss.emoji}
            </span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-xl font-bold text-white truncate">{encounter.boss.name}</h3>
            <p className="text-sm text-slate-400 mt-1 italic leading-relaxed">{encounter.boss.lore}</p>
          </div>
        </div>

        {/* HP Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">HP</span>
            <span className="font-mono text-slate-400">{encounter.current_hp} / {encounter.max_hp}</span>
          </div>
          <div className="h-5 rounded-full bg-slate-700/80 overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500"
              style={{
                width: `${hpPercent}%`,
                ...(hpPercent < 20 ? { animation: 'boss-hp-pulse 1.5s ease-in-out infinite' } : {}),
              }}
            />
            <span
              className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
            >
              {hpPercent}%
            </span>
          </div>
        </div>

        {/* Time remaining */}
        <div className="flex items-center gap-1.5 mb-4 rounded-lg bg-slate-700/50 border border-slate-600/40 px-3 py-2 w-fit">
          <Clock size={14} className="text-slate-400" />
          <span className="text-[12px] font-medium text-slate-300">
            Tid kvar: {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`}
          </span>
        </div>

        {/* Weakness / Resistance */}
        {(encounter.boss.weakness || encounter.boss.resistance) && (
          <div className="flex flex-wrap gap-3">
            {encounter.boss.weakness && (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/15 border border-green-500/30 px-3.5 py-2">
                <span className="text-base">{SPORT_CONFIG[encounter.boss.weakness]?.icon}</span>
                <span className="text-[12px] font-semibold text-green-400">
                  Svaghet: {SPORT_CONFIG[encounter.boss.weakness]?.label}
                </span>
              </div>
            )}
            {encounter.boss.resistance && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-3.5 py-2">
                <span className="text-base">{SPORT_CONFIG[encounter.boss.resistance]?.icon}</span>
                <span className="text-[12px] font-semibold text-red-400">
                  Resistans: {SPORT_CONFIG[encounter.boss.resistance]?.label}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attack Leaderboard */}
      {attackLeaderboard.length > 0 && (
        <div className="rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
            <Swords size={16} className="text-rose-500" />
            <h3 className="text-sm font-semibold text-slate-200">Skada denna vecka</h3>
          </div>
          <div className="divide-y divide-slate-800">
            {attackLeaderboard.map((entry, index) => (
              <div key={entry.userId} className="flex items-center gap-3 px-5 py-3">
                <span className="w-8 text-center text-sm font-bold text-slate-200">{getMedalEmoji(index)}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-600 text-sm font-bold text-white">
                  {entry.displayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{entry.displayName}</p>
                  <p className="text-[11px] text-slate-400">
                    {entry.attacks} attacker{entry.crits > 0 && (
                      <span className="text-amber-400 font-semibold"> &middot; {entry.crits} krit</span>
                    )}
                  </p>
                </div>
                <span className="text-sm font-bold text-rose-500">{entry.damage} dmg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attack Timeline */}
      {recentAttacks.length > 0 && (
        <div className="rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">Raid-logg</h3>
          </div>
          <div className="divide-y divide-slate-800">
            {recentAttacks.map((atk) => {
              const member = members.find((m) => m.id === atk.user_id);
              const sportIcon = SPORT_CONFIG[atk.sport_type]?.icon || '\u{2B50}';
              const timeStr = new Date(atk.created_at).toLocaleString('sv-SE', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              });
              return (
                <div key={atk.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="text-lg">{sportIcon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">
                      <span className="font-medium">{member?.display_name || 'Okänd'}</span>
                      {' '}&mdash; {atk.damage} dmg
                      {atk.is_critical && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-400">
                          KRIT!
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">{timeStr}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Boss History */}
      {history.length > 0 && (
        <div className="rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <span>Boss-historik ({history.length})</span>
            <span className="text-slate-400">{showHistory ? '\u25B2' : '\u25BC'}</span>
          </button>
          {showHistory && (
            <div className="divide-y divide-slate-800 border-t border-slate-700">
              {history.map((enc) => {
                const weekStart = new Date(enc.week_start).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
                const weekEndStr = new Date(enc.week_end).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
                return (
                  <div key={enc.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-2xl">{enc.boss.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{enc.boss.name}</p>
                      <p className="text-[11px] text-slate-400">{weekStart} &ndash; {weekEndStr}</p>
                    </div>
                    {enc.status === 'defeated' ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">Besegrad</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400">Misslyckad</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
