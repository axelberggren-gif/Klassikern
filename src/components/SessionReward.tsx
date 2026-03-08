'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { SPORT_CONFIG } from '@/lib/sport-config';
import type { Session } from '@/types/database';

interface SessionRewardProps {
  session: Session;
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

export default function SessionReward({ session, bossDamage, onDone }: SessionRewardProps) {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<1 | 2>(1);
  const [displayedDamage, setDisplayedDamage] = useState(0);
  const [showCriticalFlash, setShowCriticalFlash] = useState(false);
  const [showKillingBlow, setShowKillingBlow] = useState(false);
  const sport = SPORT_CONFIG[session.sport_type];
  const damageCounterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (damageCounterRef.current) {
      clearInterval(damageCounterRef.current);
      damageCounterRef.current = null;
    }
  }, []);

  useEffect(() => {
    setShow(true);

    if (!bossDamage) {
      // No boss damage — keep original 3s timer
      const timer = setTimeout(() => onDone(), 3000);
      return () => clearTimeout(timer);
    }

    // Phase 1: EP celebration (0–2.5s)
    const phase2Timer = setTimeout(() => {
      setPhase(2);
    }, 2500);

    // Auto-close at 6s
    const closeTimer = setTimeout(() => {
      cleanup();
      onDone();
    }, 6000);

    return () => {
      clearTimeout(phase2Timer);
      clearTimeout(closeTimer);
      cleanup();
    };
  }, [onDone, bossDamage, cleanup]);

  // Phase 2: damage counter animation
  useEffect(() => {
    if (phase !== 2 || !bossDamage) return;

    const target = bossDamage.damage;
    const duration = 1200; // ms to count up
    const steps = 30;
    const stepTime = duration / steps;
    let current = 0;

    damageCounterRef.current = setInterval(() => {
      current += Math.ceil(target / steps);
      if (current >= target) {
        current = target;
        if (damageCounterRef.current) {
          clearInterval(damageCounterRef.current);
          damageCounterRef.current = null;
        }

        // After counter finishes: critical flash
        if (bossDamage.isCritical) {
          setShowCriticalFlash(true);
          setTimeout(() => setShowCriticalFlash(false), 600);
        }

        // After counter finishes: killing blow
        if (bossDamage.isKillingBlow) {
          setTimeout(() => setShowKillingBlow(true), bossDamage.isCritical ? 700 : 200);
        }
      }
      setDisplayedDamage(current);
    }, stepTime);

    return () => {
      if (damageCounterRef.current) {
        clearInterval(damageCounterRef.current);
        damageCounterRef.current = null;
      }
    };
  }, [phase, bossDamage]);

  if (!show) return null;

  const hpPercentage = bossDamage
    ? Math.max(0, (bossDamage.remainingHP / bossDamage.maxHP) * 100)
    : 0;

  return (
    <>
      {/* Shake + critical flash keyframes */}
      <style>{`
        @keyframes boss-shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-4px, -2px) rotate(-2deg); }
          20% { transform: translate(4px, 2px) rotate(2deg); }
          30% { transform: translate(-4px, 2px) rotate(-1deg); }
          40% { transform: translate(4px, -2px) rotate(1deg); }
          50% { transform: translate(-2px, 2px) rotate(-2deg); }
          60% { transform: translate(2px, -2px) rotate(2deg); }
          70% { transform: translate(-4px, 0px) rotate(-1deg); }
          80% { transform: translate(4px, 0px) rotate(1deg); }
          90% { transform: translate(-2px, -2px) rotate(0deg); }
        }
        @keyframes critical-flash {
          0% { opacity: 0; }
          20% { opacity: 0.7; }
          100% { opacity: 0; }
        }
        @keyframes damage-pop {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes killing-blow-scale {
          0% { transform: scale(0); opacity: 0; }
          40% { transform: scale(1.15); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-boss-shake {
          animation: boss-shake 0.6s ease-in-out infinite;
        }
        .animate-damage-pop {
          animation: damage-pop 0.4s ease-out forwards;
        }
        .animate-killing-blow {
          animation: killing-blow-scale 0.6s ease-out forwards;
        }
      `}</style>

      {/* Critical hit yellow flash overlay */}
      {showCriticalFlash && (
        <div
          className="fixed inset-0 z-[60] pointer-events-none bg-yellow-300"
          style={{ animation: 'critical-flash 0.6s ease-out forwards' }}
        />
      )}

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={() => { cleanup(); onDone(); }}
      >
        <div className="animate-slide-up flex flex-col items-center gap-4 rounded-3xl bg-white p-8 shadow-2xl mx-8 relative overflow-hidden">
          {/* Confetti dots — visible in phase 1 */}
          {phase === 1 && (
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
                      backgroundColor: ['#F97316', '#3B82F6', '#22C55E', '#EAB308', '#8B5CF6'][
                        Math.floor(Math.random() * 5)
                      ],
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ===== PHASE 1: EP Celebration ===== */}
          {phase === 1 && (
            <>
              <div className="text-5xl">{sport.icon}</div>

              <div className="animate-ep-counter text-center">
                <p className="text-4xl font-black text-orange-500">+{session.ep_earned} EP</p>
              </div>

              <p className="text-lg font-semibold text-gray-800">
                {session.is_bonus ? 'Bonuspass!' : 'Pass klart!'}
              </p>
              <p className="text-sm text-gray-500">
                {session.duration_minutes} min {sport.label.toLowerCase()}
              </p>

              {!session.is_bonus && (
                <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2">
                  <span className="text-green-500">&#10003;</span>
                  <span className="text-sm font-medium text-green-700">On track!</span>
                </div>
              )}
            </>
          )}

          {/* ===== PHASE 2: Boss Damage Beat ===== */}
          {phase === 2 && bossDamage && !showKillingBlow && (
            <>
              {/* Boss emoji with shake */}
              <div className="animate-boss-shake text-6xl select-none">
                {bossDamage.bossEmoji}
              </div>

              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {bossDamage.bossName}
              </p>

              {/* Damage number */}
              <div className="animate-damage-pop text-center">
                <p className="text-5xl font-black text-red-500">
                  -{displayedDamage}
                </p>
                <p className="text-xs font-medium text-red-400 mt-1">HP skada</p>
              </div>

              {/* Critical hit label */}
              {bossDamage.isCritical && displayedDamage >= bossDamage.damage && (
                <div className="animate-damage-pop rounded-full bg-yellow-100 border border-yellow-300 px-4 py-1">
                  <span className="text-sm font-black text-yellow-600 uppercase tracking-wider">
                    Kritisk tr&auml;ff!
                  </span>
                </div>
              )}

              {/* HP Bar */}
              <div className="w-full max-w-[220px] mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>HP</span>
                  <span>{Math.max(0, bossDamage.remainingHP)} / {bossDamage.maxHP}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
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
                <p className="text-3xl font-black text-orange-500">
                  Boss besegrad!
                </p>
                <p className="text-sm text-gray-500 mt-1">
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
                        backgroundColor: ['#F97316', '#EAB308', '#F59E0B', '#FBBF24', '#FCD34D'][
                          Math.floor(Math.random() * 5)
                        ],
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-full bg-orange-50 border border-orange-200 px-4 py-2">
                <span className="text-orange-500 text-lg">&#9733;</span>
                <span className="text-sm font-bold text-orange-600">Seger!</span>
                <span className="text-orange-500 text-lg">&#9733;</span>
              </div>
            </div>
          )}

          <button
            onClick={() => { cleanup(); onDone(); }}
            className="mt-2 text-sm font-medium text-gray-400"
          >
            Tryck f&ouml;r att st&auml;nga
          </button>
        </div>
      </div>
    </>
  );
}
