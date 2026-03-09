'use client';

interface BossHPBarProps {
  currentHp: number;
  maxHp: number;
  isLastStand: boolean;
}

export default function BossHPBar({ currentHp, maxHp, isLastStand }: BossHPBarProps) {
  const percentage = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;

  const barColor =
    percentage > 50
      ? 'bg-green-500'
      : percentage > 25
        ? 'bg-amber-400'
        : 'bg-rose-500';

  return (
    <div className="w-full">
      <div
        className={`relative h-5 overflow-hidden rounded-full bg-slate-700 ${
          isLastStand ? 'animate-boss-pulse' : ''
        }`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor} ${
            isLastStand ? 'animate-boss-hp-drain' : ''
          }`}
          style={{ width: `${Math.max(percentage, 0)}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold text-white drop-shadow-md">
            {currentHp}/{maxHp} HP
          </span>
        </div>
      </div>
    </div>
  );
}
