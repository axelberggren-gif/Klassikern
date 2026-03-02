'use client';

import { Flame } from 'lucide-react';

interface StreakBadgeProps {
  streak: number;
}

function getStreakColor(streak: number) {
  if (streak >= 14) return 'text-red-500';
  if (streak >= 7) return 'text-orange-500';
  if (streak >= 3) return 'text-amber-500';
  return 'text-gray-400';
}

function getStreakBg(streak: number) {
  if (streak >= 14) return 'bg-red-50';
  if (streak >= 7) return 'bg-orange-50';
  if (streak >= 3) return 'bg-amber-50';
  return 'bg-gray-50';
}

function getStreakLabel(streak: number) {
  if (streak >= 30) return `${streak} dagar · Inferno!`;
  if (streak >= 14) return `${streak} dagar · Bonfire!`;
  if (streak >= 7) return `${streak} dagar · Flame!`;
  if (streak >= 3) return `${streak} dagar · Spark!`;
  if (streak > 0) return `${streak} dag${streak > 1 ? 'ar' : ''}`;
  return 'Starta en streak!';
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  return (
    <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${getStreakBg(streak)}`}>
      <Flame size={20} className={getStreakColor(streak)} fill={streak >= 3 ? 'currentColor' : 'none'} />
      <span className={`text-sm font-bold ${getStreakColor(streak)}`}>
        {getStreakLabel(streak)}
      </span>
    </div>
  );
}
