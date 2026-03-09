'use client';

import { SPORT_CONFIG } from '@/lib/sport-config';
import type { SportType } from '@/types/database';

interface WeaknessResistanceProps {
  weakness: SportType | null;
  resistance: SportType | null;
}

export default function WeaknessResistance({ weakness, resistance }: WeaknessResistanceProps) {
  if (!weakness && !resistance) return null;

  return (
    <div className="flex items-center gap-3">
      {weakness && (
        <div className="flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1">
          <span className="text-sm">{SPORT_CONFIG[weakness].icon}</span>
          <span className="text-[11px] font-semibold text-amber-400">Svaghet</span>
        </div>
      )}
      {resistance && (
        <div className="flex items-center gap-1.5 rounded-full bg-slate-700 px-3 py-1">
          <span className="text-sm">{SPORT_CONFIG[resistance].icon}</span>
          <span className="text-[11px] font-semibold text-slate-400">Resistent</span>
        </div>
      )}
    </div>
  );
}
