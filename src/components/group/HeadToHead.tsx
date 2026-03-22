'use client';

import { useState } from 'react';
import { Swords, ChevronDown } from 'lucide-react';
import type { Profile } from '@/types/database';

interface HeadToHeadProps {
  members: Profile[];
  currentUserId: string;
  damageMap: Map<string, number>;
  weeklySessionMap: Map<string, number>;
  weeklyEPMap: Map<string, number>;
}

interface ComparisonStat {
  label: string;
  leftValue: number;
  rightValue: number;
  format: (v: number) => string;
}

export default function HeadToHead({
  members,
  currentUserId,
  damageMap,
  weeklySessionMap,
  weeklyEPMap,
}: HeadToHeadProps) {
  const [leftUserId, setLeftUserId] = useState<string>(currentUserId);
  const [rightUserId, setRightUserId] = useState<string>(
    members.find((m) => m.id !== currentUserId)?.id ?? currentUserId
  );

  const leftUser = members.find((m) => m.id === leftUserId);
  const rightUser = members.find((m) => m.id === rightUserId);

  if (!leftUser || !rightUser) return null;

  const stats: ComparisonStat[] = [
    {
      label: 'Total EP',
      leftValue: leftUser.total_ep,
      rightValue: rightUser.total_ep,
      format: (v) => `${v} EP`,
    },
    {
      label: 'Vecka EP',
      leftValue: weeklyEPMap.get(leftUserId) ?? 0,
      rightValue: weeklyEPMap.get(rightUserId) ?? 0,
      format: (v) => `${v} EP`,
    },
    {
      label: 'Streak',
      leftValue: leftUser.current_streak,
      rightValue: rightUser.current_streak,
      format: (v) => `${v} dagar`,
    },
    {
      label: 'Boss DMG',
      leftValue: damageMap.get(leftUserId) ?? 0,
      rightValue: damageMap.get(rightUserId) ?? 0,
      format: (v) => `${v}`,
    },
    {
      label: 'Pass denna vecka',
      leftValue: weeklySessionMap.get(leftUserId) ?? 0,
      rightValue: weeklySessionMap.get(rightUserId) ?? 0,
      format: (v) => `${v} st`,
    },
  ];

  // Count category wins
  let leftWins = 0;
  let rightWins = 0;
  for (const stat of stats) {
    if (stat.leftValue > stat.rightValue) leftWins++;
    else if (stat.rightValue > stat.leftValue) rightWins++;
  }

  const overallWinner =
    leftWins > rightWins
      ? leftUserId
      : rightWins > leftWins
        ? rightUserId
        : null;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
        <Swords className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-200">Jämförelse</h3>
      </div>

      {/* User selectors */}
      <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-3">
        <div className="flex-1">
          <div className="relative">
            <select
              value={leftUserId}
              onChange={(e) => setLeftUserId(e.target.value)}
              className="w-full appearance-none bg-slate-800 text-slate-200 text-sm font-medium rounded-lg px-3 py-2 pr-8 border border-slate-700 focus:outline-none focus:border-emerald-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <span className="text-xs font-bold text-slate-500">VS</span>
        <div className="flex-1">
          <div className="relative">
            <select
              value={rightUserId}
              onChange={(e) => setRightUserId(e.target.value)}
              className="w-full appearance-none bg-slate-800 text-slate-200 text-sm font-medium rounded-lg px-3 py-2 pr-8 border border-slate-700 focus:outline-none focus:border-emerald-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Overall winner banner */}
      {overallWinner && leftUserId !== rightUserId && (
        <div className="px-5 py-2 bg-amber-500/10 border-b border-slate-800 text-center">
          <span className="text-sm font-semibold text-amber-400">
            👑{' '}
            {overallWinner === leftUserId
              ? leftUser.display_name
              : rightUser.display_name}{' '}
            leder {Math.max(leftWins, rightWins)}-{Math.min(leftWins, rightWins)}
          </span>
        </div>
      )}

      {/* Comparison grid */}
      <div className="divide-y divide-slate-800">
        {stats.map((stat) => {
          const leftWin = stat.leftValue > stat.rightValue;
          const rightWin = stat.rightValue > stat.leftValue;
          const tie = stat.leftValue === stat.rightValue;

          return (
            <div key={stat.label} className="flex items-center px-5 py-3">
              {/* Left value */}
              <span
                className={`flex-1 text-sm font-bold tabular-nums ${
                  leftWin
                    ? 'text-emerald-400'
                    : rightWin
                      ? 'text-rose-400'
                      : 'text-slate-300'
                }`}
              >
                {stat.format(stat.leftValue)}
              </span>

              {/* Category label */}
              <span className="text-xs text-slate-500 font-medium px-2 text-center w-32 shrink-0">
                {stat.label}
                {tie && leftUserId !== rightUserId && (
                  <span className="block text-[10px] text-slate-600">lika</span>
                )}
              </span>

              {/* Right value */}
              <span
                className={`flex-1 text-sm font-bold tabular-nums text-right ${
                  rightWin
                    ? 'text-emerald-400'
                    : leftWin
                      ? 'text-rose-400'
                      : 'text-slate-300'
                }`}
              >
                {stat.format(stat.rightValue)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
