'use client';

import { Trophy, TrendingUp } from 'lucide-react';

interface WeeklyWinner {
  weekNumber: number;
  weekStart: string;
  userId: string;
  displayName: string;
  value: number;
}

interface WeeklyHistoryProps {
  winners: WeeklyWinner[];
  currentUserId: string;
}

export default function WeeklyHistory({ winners, currentUserId }: WeeklyHistoryProps) {
  // Calculate win counts per user
  const winCounts = new Map<string, { name: string; count: number }>();
  for (const w of winners) {
    const existing = winCounts.get(w.userId);
    if (existing) {
      existing.count++;
    } else {
      winCounts.set(w.userId, { name: w.displayName, count: 1 });
    }
  }

  const sortedWinCounts = [...winCounts.entries()].sort(
    (a, b) => b[1].count - a[1].count
  );

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-200">Veckovinnare</h3>
      </div>

      {/* Win count summary */}
      {sortedWinCounts.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2 flex-wrap">
          <TrendingUp className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <p className="text-xs text-slate-400">
            {sortedWinCounts.map(([userId, { name, count }], i) => (
              <span key={userId}>
                {i > 0 && ', '}
                <span
                  className={
                    userId === currentUserId
                      ? 'text-emerald-400 font-medium'
                      : 'text-slate-300 font-medium'
                  }
                >
                  {name}
                </span>
                : {count} {count === 1 ? 'vinst' : 'vinster'}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Weekly timeline */}
      <div className="divide-y divide-slate-800">
        {winners.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-slate-500">
            Inga veckovinnare att visa
          </div>
        )}
        {winners.map((week) => {
          const isCurrentUser = week.userId === currentUserId;

          return (
            <div
              key={week.weekNumber}
              className={`flex items-center gap-3 px-5 py-3 ${
                isCurrentUser ? 'bg-emerald-500/10' : ''
              }`}
            >
              <span className="text-xs font-semibold text-slate-500 w-16 shrink-0">
                Vecka {week.weekNumber}
              </span>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 ${
                    isCurrentUser ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                >
                  {week.displayName.charAt(0)}
                </div>
                <span
                  className={`text-sm font-medium truncate ${
                    isCurrentUser ? 'text-emerald-400' : 'text-slate-200'
                  }`}
                >
                  {week.displayName}
                </span>
                <span className="text-sm">🏆</span>
              </div>
              <span
                className={`text-sm font-bold tabular-nums shrink-0 ${
                  isCurrentUser ? 'text-emerald-400' : 'text-slate-200'
                }`}
              >
                {week.value} EP
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
