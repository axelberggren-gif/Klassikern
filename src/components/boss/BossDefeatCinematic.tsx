'use client';

import { useEffect, useState } from 'react';

interface BossDefeatCinematicProps {
  bossEmoji: string;
  bossName: string;
  defeatText: string;
  critSecret: string | null;
  bonusDamage: number;
  killerName: string;
  onDone: () => void;
}

type Phase = 'darkening' | 'boss_appear' | 'damage_flash' | 'defeat' | 'speech' | 'secret' | 'done';

export default function BossDefeatCinematic({
  bossEmoji,
  bossName,
  defeatText,
  critSecret,
  bonusDamage,
  killerName,
  onDone,
}: BossDefeatCinematicProps) {
  const [phase, setPhase] = useState<Phase>('darkening');
  const [typedText, setTypedText] = useState('');
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase timeline
    timers.push(setTimeout(() => setPhase('boss_appear'), 600));
    timers.push(setTimeout(() => setPhase('damage_flash'), 1800));
    timers.push(setTimeout(() => setPhase('defeat'), 2200));
    timers.push(setTimeout(() => setPhase('speech'), 3400));
    timers.push(setTimeout(() => setShowSkip(true), 4000));

    return () => timers.forEach(clearTimeout);
  }, []);

  // Typewriter effect for defeat text
  useEffect(() => {
    if (phase !== 'speech' && phase !== 'secret') return;

    const text = phase === 'secret' && critSecret ? critSecret : defeatText;
    if (phase === 'speech') setTypedText('');

    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setTypedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [phase, defeatText, critSecret]);

  function handleTap() {
    if (phase === 'speech') {
      if (typedText.length < defeatText.length) {
        // Skip typewriter — show full text
        setTypedText(defeatText);
      } else if (critSecret) {
        setPhase('secret');
      } else {
        onDone();
      }
    } else if (phase === 'secret') {
      onDone();
    } else if (showSkip) {
      onDone();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      onClick={handleTap}
    >
      {/* Background overlay */}
      <div
        className={`absolute inset-0 transition-all duration-700 ${
          phase === 'darkening' ? 'bg-black/0' : 'bg-black/90'
        }`}
      />

      {/* Damage flash */}
      {phase === 'damage_flash' && (
        <div className="absolute inset-0 animate-boss-damage-flash bg-white/80 z-10" />
      )}

      {/* Screen shake wrapper */}
      <div
        className={`relative z-20 flex flex-col items-center px-8 w-full max-w-md ${
          phase === 'damage_flash' ? 'animate-boss-screen-shake' : ''
        }`}
      >
        {/* Boss emoji — large and animated */}
        {(phase !== 'darkening') && (
          <div
            className={`text-center mb-6 ${
              phase === 'boss_appear'
                ? 'animate-boss-entrance'
                : phase === 'damage_flash'
                  ? 'animate-boss-cinematic-hit'
                  : phase === 'defeat' || phase === 'speech' || phase === 'secret'
                    ? 'animate-boss-crumble'
                    : ''
            }`}
          >
            <span className="text-[120px] leading-none block">{bossEmoji}</span>
          </div>
        )}

        {/* Boss name */}
        {phase !== 'darkening' && (
          <h2
            className={`text-2xl font-black text-center mb-2 transition-colors duration-500 ${
              phase === 'defeat' || phase === 'speech' || phase === 'secret'
                ? 'text-rose-500'
                : 'text-slate-50'
            }`}
          >
            {bossName}
          </h2>
        )}

        {/* DEFEATED banner */}
        {(phase === 'defeat' || phase === 'speech' || phase === 'secret') && (
          <div className="animate-boss-defeated-banner mb-6">
            <div className="bg-gradient-to-r from-rose-600 to-amber-500 px-6 py-2 rounded-lg">
              <p className="text-sm font-black text-white tracking-widest uppercase">
                ☠️ Besegrad ☠️
              </p>
            </div>
            <p className="text-xs text-emerald-400 font-bold mt-2 text-center">
              Dödsstöt av {killerName}!
            </p>
          </div>
        )}

        {/* Speech bubble with defeat text */}
        {(phase === 'speech' || phase === 'secret') && (
          <div className="animate-slide-up w-full">
            {phase === 'speech' && (
              <div className="bg-slate-800/90 border border-slate-600 rounded-2xl p-5 relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800 border-l border-t border-slate-600 rotate-45" />
                <p className="text-sm text-slate-200 leading-relaxed italic">
                  &ldquo;{typedText}&rdquo;
                  {typedText.length < defeatText.length && (
                    <span className="animate-pulse">|</span>
                  )}
                </p>
              </div>
            )}

            {/* Secret weakness reveal */}
            {phase === 'secret' && critSecret && (
              <div className="mt-4 animate-boss-secret-reveal">
                <div className="bg-gradient-to-r from-violet-900/80 to-indigo-900/80 border border-violet-500/50 rounded-2xl p-5">
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-2">
                    🔮 Hemlig svaghet avslöjad
                  </p>
                  <p className="text-sm text-violet-200 leading-relaxed">
                    {typedText}
                    {typedText.length < critSecret.length && (
                      <span className="animate-pulse">|</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Loot */}
            <div className="mt-4 flex justify-center">
              <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-5 py-3 text-center">
                <p className="text-xs text-emerald-400 font-medium">Bonus EP</p>
                <p className="text-2xl font-black text-emerald-400">+{bonusDamage} EP</p>
              </div>
            </div>
          </div>
        )}

        {/* EP particles */}
        {(phase === 'defeat' || phase === 'speech' || phase === 'secret') && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-boss-loot-particle text-emerald-400 font-bold text-xs"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                +EP
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tap to continue */}
      {showSkip && (
        <p className="absolute bottom-12 text-xs text-slate-500 animate-pulse z-30">
          Tryck för att fortsätta
        </p>
      )}
    </div>
  );
}
