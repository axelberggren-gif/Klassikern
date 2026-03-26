'use client';

import { useEffect, useState } from 'react';
import { SPORT_CONFIG } from '@/lib/sport-config';
import type { Session } from '@/types/database';
import type { PersonalRecord } from '@/lib/pr-checker';

interface SessionRewardProps {
  session: Session;
  personalRecords?: PersonalRecord[];
  bossDamage?: {
    damage: number;
    isCritical: boolean;
    bossEmoji: string;
    bossName: string;
    isKillingBlow: boolean;
    remainingHP: number;
    maxHP: number;
  } | null;
  onDone: () => void;
}

export default function SessionReward({ session, personalRecords = [], bossDamage, onDone }: SessionRewardProps) {
  const [show, setShow] = useState(false);
  const sport = SPORT_CONFIG[session.sport_type];

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => onDone(), 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onDone}>
      <div className="animate-slide-up flex flex-col items-center gap-4 rounded-3xl bg-slate-900 border border-slate-700 p-8 shadow-2xl mx-8">
        {/* Confetti dots */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1.5 + Math.random()}s`,
              }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: ['#10B981', '#3B82F6', '#22C55E', '#FBBF24', '#8B5CF6'][
                    Math.floor(Math.random() * 5)
                  ],
                }}
              />
            </div>
          )}

          {/* ===== PHASE 1: EP Celebration ===== */}
          {phase === 1 && (
            <>
              <div className="text-5xl">{sport.icon}</div>

              <div className="animate-ep-counter text-center">
                <p className="text-4xl font-black text-emerald-400">+{session.ep_earned} EP</p>
              </div>

              <p className="text-lg font-semibold text-slate-50">
                {session.is_bonus ? 'Bonuspass!' : 'Pass klart!'}
              </p>
              <p className="text-sm text-slate-400">
                {session.duration_minutes} min {sport.label.toLowerCase()}
              </p>

              {!session.is_bonus && (
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2">
                  <span className="text-emerald-400">&#10003;</span>
                  <span className="text-sm font-medium text-emerald-400">On track!</span>
                </div>
              )}

              {/* Personal Record badges */}
              {personalRecords.length > 0 && (
                <div className="flex flex-col items-center gap-2 mt-1 w-full">
                  {personalRecords.map((pr, i) => (
                    <div
                      key={pr.category}
                      className="flex items-center gap-2 rounded-full bg-amber-400/15 border border-amber-400/30 px-4 py-2 animate-slide-up"
                      style={{ animationDelay: `${0.3 + i * 0.15}s`, animationFillMode: 'both' }}
                    >
                      <span className="text-amber-400 text-base">&#127942;</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-amber-300">
                          Nytt rekord! {pr.label}
                        </span>
                        <span className="text-xs text-amber-400/80">
                          {pr.formattedValue}
                          {pr.formattedPrevious && (
                            <> <span className="text-slate-500">&#8592;</span> {pr.formattedPrevious}</>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ===== PHASE 2: Boss Damage Beat ===== */}
          {phase === 2 && bossDamage && !showKillingBlow && (
            <>
              {/* Boss emoji with shake + attack particles */}
              <div className="relative">
                <div className="animate-boss-shake text-6xl select-none">
                  {bossDamage.bossEmoji}
                </div>

                {/* Attack particles */}
                {showParticles && (
                  <div className="absolute inset-0 pointer-events-none">
                    {particlesRef.current.map((p, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          width: `${p.size}px`,
                          height: `${p.size}px`,
                          borderRadius: '50%',
                          backgroundColor: p.color,
                          ['--angle' as string]: `${p.angle}deg`,
                          ['--distance' as string]: `${p.distance}px`,
                          animation: `particle-burst ${p.duration}s ease-out ${p.delay}s forwards`,
                          opacity: 0,
                          animationFillMode: 'forwards',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                {bossDamage.bossName}
              </p>

              {/* Damage number */}
              <div className="animate-damage-pop text-center">
                <p className="text-5xl font-black text-rose-500">
                  -{displayedDamage}
                </p>
                <p className="text-xs font-medium text-rose-400 mt-1">HP skada</p>
              </div>

              {/* Critical hit label */}
              {bossDamage.isCritical && displayedDamage >= bossDamage.damage && (
                <div className="animate-damage-pop rounded-full bg-violet-500/15 border border-violet-500/30 px-4 py-1">
                  <span className="text-sm font-black text-violet-400 uppercase tracking-wider">
                    Kritisk tr&auml;ff!
                  </span>
                </div>
              )}

              {/* HP Bar */}
              <div className="w-full max-w-[220px] mt-2">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>HP</span>
                  <span>{Math.max(0, bossDamage.remainingHP)} / {bossDamage.maxHP}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${hpPercentage}%`,
                      backgroundColor: hpPercentage > 50 ? '#22C55E' : hpPercentage > 20 ? '#EAB308' : '#EF4444',
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* ===== KILLING BLOW CELEBRATION ===== */}
          {phase === 2 && bossDamage && showKillingBlow && (
            <div className="animate-killing-blow flex flex-col items-center gap-3">
              {/* Defeated boss */}
              <div className="text-7xl grayscale opacity-60 select-none">
                {bossDamage.bossEmoji}
              </div>

              <div className="text-center">
                <p className="text-3xl font-black text-emerald-400">
                  Boss besegrad!
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {bossDamage.bossName} &auml;r nedlagd!
                </p>
              </div>

              {/* Victory confetti burst */}
              <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute animate-confetti"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 0.3}s`,
                      animationDuration: `${1 + Math.random() * 0.8}s`,
                    }}
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: ['#10B981', '#34D399', '#059669', '#FBBF24', '#8B5CF6'][
                          Math.floor(Math.random() * 5)
                        ],
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-4 py-2">
                <span className="text-emerald-400 text-lg">&#9733;</span>
                <span className="text-sm font-bold text-emerald-400">Seger!</span>
                <span className="text-emerald-400 text-lg">&#9733;</span>
              </div>
            </div>
          )}

          <button
            onClick={() => { cleanup(); onDone(); }}
            className="mt-2 text-sm font-medium text-slate-400"
          >
            Tryck f&ouml;r att st&auml;nga
          </button>
        </div>
      </div>
    </div>
  );
}
