'use client';

import { Flame } from 'lucide-react';

interface StreakBadgeProps {
  streak: number;
}

function getStreakColor(streak: number) {
  if (streak >= 14) return 'text-red-500';
  if (streak >= 7) return 'text-orange-500';
  if (streak >= 3) return 'text-amber-500';
  return 'text-slate-400';
}

function getStreakBg(streak: number) {
  if (streak >= 14) return 'bg-red-500/15';
  if (streak >= 7) return 'bg-orange-500/15';
  if (streak >= 3) return 'bg-amber-500/15';
  return 'bg-slate-800';
}

function getStreakLabel(streak: number) {
  if (streak >= 30) return `${streak}d · Inferno!`;
  if (streak >= 14) return `${streak}d · Bonfire!`;
  if (streak >= 7) return `${streak}d · Flame!`;
  if (streak >= 3) return `${streak}d · Spark!`;
  if (streak > 0) return `${streak}d`;
  return '0';
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${getStreakBg(streak)}`}>
      <Flame size={16} className={getStreakColor(streak)} fill={streak >= 3 ? 'currentColor' : 'none'} />
      <span className={`text-xs font-bold ${getStreakColor(streak)}`}>
        {getStreakLabel(streak)}
      </span>
    </div>
  );
}
