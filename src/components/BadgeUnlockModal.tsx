'use client';

import { useEffect, useState } from 'react';
import {
  Trophy,
  Flame,
  Zap,
  Bike,
  Waves,
  PersonStanding,
  Medal,
  Crown,
  Star,
  Target,
} from 'lucide-react';
import type { Badge } from '@/types/database';

// ---------------------------------------------------------------------------
// Icon map: badge icon_key -> lucide-react component
// ---------------------------------------------------------------------------

const BADGE_ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  trophy: Trophy,
  flame: Flame,
  zap: Zap,
  bike: Bike,
  waves: Waves,
  'person-standing': PersonStanding,
  medal: Medal,
  crown: Crown,
  star: Star,
  target: Target,
};

export function getBadgeIcon(
  iconKey: string
): React.ComponentType<{ size?: number; className?: string }> {
  return BADGE_ICON_MAP[iconKey] ?? Trophy;
}

// ---------------------------------------------------------------------------
// BadgeUnlockModal
// ---------------------------------------------------------------------------

interface BadgeUnlockModalProps {
  badge: Badge;
  onDismiss: () => void;
}

export default function BadgeUnlockModal({
  badge,
  onDismiss,
}: BadgeUnlockModalProps) {
  const [visible, setVisible] = useState(false);
  const Icon = getBadgeIcon(badge.icon_key);

  useEffect(() => {
    // Trigger entrance animation on mount
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function handleDismiss() {
    setVisible(false);
    setTimeout(onDismiss, 200);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        visible ? 'bg-black/50 opacity-100' : 'bg-black/0 opacity-0'
      }`}
      onClick={handleDismiss}
    >
      <div
        className={`relative mx-8 flex max-w-sm flex-col items-center gap-4 rounded-3xl bg-white p-8 shadow-2xl transition-all duration-500 ${
          visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ring behind icon */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-28 w-28 animate-pulse rounded-full bg-gradient-to-br from-orange-200 to-amber-100 opacity-60" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg">
            <Icon size={36} className="text-white" />
          </div>
        </div>

        {/* Badge info */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
            Nytt badge!
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">
            {badge.name}
          </h2>
          <p className="mt-2 text-sm text-gray-500">{badge.description}</p>
        </div>

        {/* Confetti dots */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          {Array.from({ length: 16 }).map((_, i) => (
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
                  backgroundColor: [
                    '#F97316',
                    '#3B82F6',
                    '#22C55E',
                    '#EAB308',
                    '#8B5CF6',
                  ][Math.floor(Math.random() * 5)],
                }}
              />
            </div>
          ))}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="mt-2 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-sm font-bold text-white shadow-md transition-transform active:scale-[0.97]"
        >
          Fantastiskt!
        </button>
      </div>
    </div>
  );
}
