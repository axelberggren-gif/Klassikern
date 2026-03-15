'use client';

interface BossHPBarProps {
  currentHp: number;
  maxHp: number;
  isLastStand: boolean;
  /** If set, shows a ghost bar draining from previousHp to currentHp */
  previousHp?: number;
}

export default function BossHPBar({ currentHp, maxHp, isLastStand, previousHp }: BossHPBarProps) {
  const percentage = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
  const previousPercentage = previousHp != null && maxHp > 0 ? (previousHp / maxHp) * 100 : null;
  const showDrain = previousPercentage != null && previousPercentage > percentage;

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
        {/* Ghost bar showing previous HP (drains away) */}
        {showDrain && (
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-rose-400/60 animate-hp-drain-ghost"
            style={{ width: `${Math.max(previousPercentage, 0)}%` }}
          />
        )}
        {/* Current HP bar */}
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor} ${
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
