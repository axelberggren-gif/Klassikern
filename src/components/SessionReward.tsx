'use client';

import { useEffect, useState } from 'react';
import { SPORT_CONFIG } from '@/lib/sport-config';
import type { Session } from '@/types/database';

interface SessionRewardProps {
  session: Session;
  onDone: () => void;
}

export default function SessionReward({ session, onDone }: SessionRewardProps) {
  const [show, setShow] = useState(false);
  const sport = SPORT_CONFIG[session.sport_type];

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => onDone(), 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onDone}>
      <div className="animate-slide-up flex flex-col items-center gap-4 rounded-3xl bg-white p-8 shadow-2xl mx-8">
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
                  backgroundColor: ['#F97316', '#3B82F6', '#22C55E', '#EAB308', '#8B5CF6'][
                    Math.floor(Math.random() * 5)
                  ],
                }}
              />
            </div>
          ))}
        </div>

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
            <span className="text-green-500">✓</span>
            <span className="text-sm font-medium text-green-700">On track!</span>
          </div>
        )}

        <button
          onClick={onDone}
          className="mt-2 text-sm font-medium text-gray-400"
        >
          Tryck för att stänga
        </button>
      </div>
    </div>
  );
}
