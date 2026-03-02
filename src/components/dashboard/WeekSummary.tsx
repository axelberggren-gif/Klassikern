'use client';

import type { PlannedSession, Session } from '@/types/database';
import { SPORT_CONFIG } from '@/lib/sport-config';

interface WeekSummaryProps {
  weekPlan: PlannedSession[];
  weekSessions: Session[];
  weekNumber: number;
}

const DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

export default function WeekSummary({ weekPlan, weekSessions, weekNumber }: WeekSummaryProps) {
  const activeDays = weekPlan.filter((p) => p.sport_type !== 'rest');
  const completedCount = weekSessions.length;
  const percentage = activeDays.length > 0 ? Math.round((completedCount / activeDays.length) * 100) : 0;

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Vecka {weekNumber}</h3>
        <span className="text-sm font-bold text-orange-600">
          {completedCount}/{activeDays.length} pass
        </span>
      </div>

      {/* Day indicators */}
      <div className="flex justify-between gap-1">
        {Array.from({ length: 7 }, (_, i) => {
          const dayNum = i + 1;
          const planned = weekPlan.find((p) => p.day_of_week === dayNum);
          const isRest = planned?.sport_type === 'rest';
          const isCompleted = weekSessions.some((s) => {
            const d = new Date(s.date);
            return d.getDay() === (dayNum % 7); // Convert 1-7 Mon-Sun to JS 0-6
          });

          const sport = planned ? SPORT_CONFIG[planned.sport_type] : null;

          return (
            <div key={dayNum} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-gray-400">{DAY_LABELS[i]}</span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-all ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isRest
                      ? 'bg-gray-100 text-gray-400'
                      : sport
                        ? `${sport.bgColor} ${sport.textColor}`
                        : 'bg-gray-100 text-gray-300'
                }`}
              >
                {isCompleted ? '✓' : isRest ? '·' : sport?.icon || ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs text-gray-400">{percentage}%</p>
    </div>
  );
}
