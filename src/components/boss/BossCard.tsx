'use client';

import { useState, useCallback, useMemo } from 'react';
import { Swords, Loader2, Zap, BookOpen, ChevronDown } from 'lucide-react';
import BossHPBar from './BossHPBar';
import WeaknessResistance from './WeaknessResistance';
import BossAttackLog from './BossAttackLog';
import { isLastStandWindow } from '@/lib/boss-engine';
import { SPORT_CONFIG } from '@/lib/sport-config';
import type { BossEncounterWithBoss, BossAttackWithUser, SportType, CritCondition } from '@/types/database';
import type { WeeklyEPInfo } from '@/lib/store';

/** Convert crit conditions into cryptic in-universe riddles (no spoilers). */
function getCrypticHints(conditions: CritCondition[]): string[] {
  const hintMap: Record<string, string> = {
    evening_session: '🌙 Mörkret ger kraft åt den som vågar...',
    dawn_raid: '🌅 De som vaknar före solen ser svagheten...',
    long_session: '⏳ Uthållighet bryter ner det starkaste pansar...',
    weekend_warrior: '📅 Vilan har sitt eget slags magi...',
    first_attack_of_day: '⚡ Den första stöten bär en dold kraft...',
    streak: '🔥 Dag efter dag, gnistan blir till eld...',
    group_sync: '🤝 Tillsammans öppnas dolda vägar...',
  };
  return conditions.map((c) => hintMap[c.type] ?? '❓ En okänd kraft vilar här...');
}

/** Pick a boss taunt from defeat_quotes, stripped of placeholders. */
function getBossTaunt(quotes: string[]): string | null {
  if (quotes.length === 0) return null;
  // Use a stable-ish index based on the hour so it doesn't flicker on re-render
  const idx = new Date().getHours() % quotes.length;
  return quotes[idx]
    .replace(/\{killer\}/g, 'ni')
    .replace(/\{random_member\}/g, 'er')
    .split(/[.!?]/)[0] + '...'; // Just the first sentence fragment as a teaser
}

interface BossCardProps {
  encounter: BossEncounterWithBoss | null;
  attacks: BossAttackWithUser[];
  weeklyEP: WeeklyEPInfo | null;
  onAttack: () => Promise<{ damage: number; isCritical: boolean } | null>;
}

export default function BossCard({ encounter, attacks, weeklyEP, onAttack }: BossCardProps) {
  const [attacking, setAttacking] = useState(false);
  const [loreExpanded, setLoreExpanded] = useState(false);
  // Hit animation state
  const [hitState, setHitState] = useState<{
    damage: number;
    isCritical: boolean;
    previousHp: number;
  } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [emojiHit, setEmojiHit] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);

  const crypticHints = useMemo(
    () => getCrypticHints(encounter?.boss.crit_conditions ?? []),
    [encounter?.boss.crit_conditions]
  );
  const bossTaunt = useMemo(
    () => getBossTaunt(encounter?.boss.defeat_quotes ?? []),
    [encounter?.boss.defeat_quotes]
  );

  const handleAttack = useCallback(async () => {
    if (!weeklyEP || weeklyEP.totalEP <= 0 || attacking || !encounter) return;
    setAttacking(true);
    setHitState(null);

    const previousHp = encounter.current_hp;

    try {
      const result = await onAttack();
      if (result) {
        // Trigger all hit animations
        setScreenFlash(true);
        setShaking(true);
        setEmojiHit(true);
        setHitState({ damage: result.damage, isCritical: result.isCritical, previousHp });

        // Stagger animation cleanup
        setTimeout(() => setScreenFlash(false), 600);
        setTimeout(() => setShaking(false), 600);
        setTimeout(() => setEmojiHit(false), 500);
        setTimeout(() => setHitState(null), 3000);
      }
    } finally {
      setAttacking(false);
    }
  }, [weeklyEP, attacking, encounter, onAttack]);

  if (!encounter) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center">
        <span className="text-4xl">⚔️</span>
        <p className="mt-3 text-sm font-semibold text-slate-200">Ingen aktiv boss</p>
        <p className="mt-1 text-xs text-slate-400">En ny boss dyker upp varje vecka</p>
      </div>
    );
  }

  const lastStand = isLastStandWindow(encounter);
  const boss = encounter.boss;
  const hasEP = weeklyEP && weeklyEP.totalEP > 0;

  return (
    <div className="relative">
      {/* Full-card red flash overlay on hit */}
      {screenFlash && (
        <div className="absolute inset-0 z-20 rounded-2xl bg-rose-500/40 animate-boss-hit-flash pointer-events-none" />
      )}

      {/* Floating damage number */}
      {hitState && (
        <div className="absolute inset-x-0 top-8 z-30 flex justify-center pointer-events-none">
          <span
            className={`text-3xl font-black drop-shadow-lg ${
              hitState.isCritical
                ? 'text-yellow-400 animate-damage-float-crit'
                : 'text-rose-400 animate-damage-float'
            }`}
          >
            {hitState.isCritical && '💥 '}
            -{hitState.damage}
          </span>
        </div>
      )}

      {/* Slash effect */}
      {hitState && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <span className="text-6xl animate-slash-appear">⚔️</span>
        </div>
      )}

      <div
        className={`rounded-2xl border bg-slate-900 p-5 ${
          lastStand
            ? 'border-rose-500/50 animate-last-stand-border'
            : 'border-slate-700'
        } ${shaking ? 'animate-boss-hit-shake' : ''}`}
      >
        {/* Boss identity */}
        <div className="flex items-start gap-4 mb-4">
          <span className={`text-6xl leading-none ${emojiHit ? 'animate-boss-emoji-hit' : ''}`}>
            {boss.emoji}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-50">{boss.name}</h2>
            <p className="mt-1 text-xs italic text-slate-400 line-clamp-2">
              {boss.lore}
            </p>
          </div>
        </div>

        {/* Expandable mythology */}
        <button
          onClick={() => setLoreExpanded(!loreExpanded)}
          className="flex w-full items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2 mb-3 transition-colors active:bg-slate-800"
        >
          <BookOpen size={14} className="text-amber-400 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-amber-400">Mytologi</span>
          <ChevronDown
            size={14}
            className={`ml-auto text-slate-500 transition-transform ${loreExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        {loreExpanded && (
          <div className="mb-4 rounded-xl bg-gradient-to-b from-slate-800/80 to-slate-900/80 border border-amber-500/10 px-4 py-3 animate-slide-up">
            <p className="text-xs text-slate-300 italic leading-relaxed">
              {boss.lore}
            </p>
            {bossTaunt && (
              <div className="mt-3 border-t border-slate-700/50 pt-3">
                <p className="text-[10px] font-bold text-rose-400/80 uppercase tracking-wider mb-1">
                  {boss.emoji} {boss.name} viskar:
                </p>
                <p className="text-xs text-rose-300/70 italic">
                  &ldquo;{bossTaunt}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}

        {/* HP Bar */}
        <BossHPBar
          currentHp={encounter.current_hp}
          maxHp={encounter.max_hp}
          isLastStand={lastStand}
          previousHp={hitState?.previousHp}
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
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <WeaknessResistance weakness={boss.weakness} resistance={boss.resistance} />
        </div>

        {/* Cryptic crit hints */}
        {crypticHints.length > 0 && (
          <div className="mt-3 rounded-xl bg-violet-500/5 border border-violet-500/15 px-3 py-2.5">
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1.5">
              🔮 Dolda svagheter
            </p>
            <div className="flex flex-col gap-1">
              {crypticHints.map((hint, i) => (
                <p key={i} className="text-[11px] text-violet-300/70 italic">
                  {hint}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Hit result banner (persists for 3s) */}
        {hitState && (
          <div
            className={`mt-3 rounded-lg px-4 py-3 text-center ${
              hitState.isCritical
                ? 'bg-yellow-500/10 border border-yellow-500/30'
                : 'bg-emerald-500/10 border border-emerald-500/30'
            }`}
          >
            <p className={`text-lg font-bold ${
              hitState.isCritical ? 'text-yellow-400' : 'text-emerald-400'
            }`}>
              {hitState.isCritical ? '💥 KRITISK TRÄFF!' : '⚔️ Träff!'}
            </p>
            <p className="text-sm text-slate-300 mt-0.5">
              -{hitState.damage} HP skada
            </p>
          </div>
        )}

        {/* Recent attacks */}
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Senaste attacker
          </p>
          <BossAttackLog attacks={attacks} />
        </div>

        {/* Accumulated EP display + CTA */}
        <div className="mt-5">
          {hasEP ? (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs text-slate-400">Uppladdad energi</span>
                <span className="flex items-center gap-1 text-sm font-bold text-emerald-400">
                  <Zap size={14} />
                  {weeklyEP.totalEP} EP
                </span>
              </div>
              {/* Sport breakdown with weakness/resistance indicators */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(weeklyEP.epBySport).map(([sport, ep]) => {
                  const cfg = SPORT_CONFIG[sport as SportType];
                  const isWeak = encounter.boss.weakness === sport;
                  const isResist = encounter.boss.resistance === sport;
                  return (
                    <span
                      key={sport}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isWeak
                          ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                          : isResist
                            ? 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30'
                            : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {cfg?.icon} {ep} EP
                      {isWeak && ' ×1.5'}
                      {isResist && ' ×0.75'}
                    </span>
                  );
                })}
              </div>
              <button
                onClick={handleAttack}
                disabled={attacking}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.97] disabled:opacity-60 disabled:shadow-none"
              >
                {attacking ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Swords size={18} />
                )}
                {attacking ? 'Attackerar...' : `Attackera! (${weeklyEP.totalEP} EP)`}
              </button>
            </>
          ) : (
            <div className="rounded-xl bg-slate-800 border border-slate-700 py-3.5 text-center">
              <p className="text-xs text-slate-400">
                Logga träning för att ladda upp en attack
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
