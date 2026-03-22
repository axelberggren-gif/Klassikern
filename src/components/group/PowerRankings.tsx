'use client';

import { useState } from 'react';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';

interface PowerRanking {
  userId: string;
  displayName: string;
  score: number;
  epScore: number;
  streakScore: number;
  damageScore: number;
  consistencyScore: number;
  previousRank: number | null;
  currentRank: number;
}

interface PowerRankingsProps {
  rankings: PowerRanking[];
  currentUserId: string;
}

function getMedalEmoji(index: number): string {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `${index + 1}`;
}

function MovementIndicator({ previous, current }: { previous: number | null; current: number }) {
  if (previous === null) {
    return <span className="text-xs text-slate-500 w-5 text-center">—</span>;
  }

  const diff = previous - current; // positive = moved up

  if (diff > 0) {
    return (
      <span className="text-xs text-emerald-400 font-bold w-5 text-center flex items-center justify-center">
        <ChevronUp className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="text-xs text-rose-400 font-bold w-5 text-center flex items-center justify-center">
        <ChevronDown className="h-3.5 w-3.5" />
      </span>
    );
  }
  return <span className="text-xs text-slate-500 w-5 text-center">—</span>;
}

interface ScoreBarProps {
  label: string;
  value: number;
  percentage: string;
  color: string;
}

function ScoreBar({ label, value, percentage, color }: ScoreBarProps) {
  const maxWidth = 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-24 shrink-0">{label} ({percentage})</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(value, maxWidth)}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 tabular-nums w-8 text-right">
        {Math.round(value)}
      </span>
    </div>
  );
}

export default function PowerRankings({ rankings, currentUserId }: PowerRankingsProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const sorted = [...rankings].sort((a, b) => a.currentRank - b.currentRank);

  // Find max composite score for bar scaling
  const maxScore = Math.max(...sorted.map((r) => r.score), 1);

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
        <Zap className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-200">Power Rankings</h3>
      </div>

      {/* Rankings list */}
      <div className="divide-y divide-slate-800">
        {sorted.map((ranking, index) => {
          const isCurrentUser = ranking.userId === currentUserId;
          const isExpanded = expandedUserId === ranking.userId;
          const isTopRanked = index === 0;

          // Normalize breakdown values for bar display (percentage of max)
          const epNorm = maxScore > 0 ? (ranking.epScore / maxScore) * 100 : 0;
          const streakNorm = maxScore > 0 ? (ranking.streakScore / maxScore) * 100 : 0;
          const damageNorm = maxScore > 0 ? (ranking.damageScore / maxScore) * 100 : 0;
          const consistencyNorm = maxScore > 0 ? (ranking.consistencyScore / maxScore) * 100 : 0;

          return (
            <div key={ranking.userId}>
              <button
                onClick={() =>
                  setExpandedUserId(isExpanded ? null : ranking.userId)
                }
                className={`w-full flex items-center gap-3 px-5 py-3 transition-colors text-left ${
                  isCurrentUser ? 'bg-emerald-500/10' : ''
                } ${isTopRanked ? 'ring-1 ring-inset ring-amber-500/30' : ''}`}
              >
                <span className="w-7 text-center text-sm font-bold text-slate-200">
                  {getMedalEmoji(index)}
                </span>
                <MovementIndicator
                  previous={ranking.previousRank}
                  current={ranking.currentRank}
                />
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 ${
                    isCurrentUser
                      ? 'bg-emerald-500'
                      : isTopRanked
                        ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-600'
                  }`}
                >
                  {ranking.displayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      isCurrentUser
                        ? 'text-emerald-400'
                        : isTopRanked
                          ? 'text-amber-400'
                          : 'text-slate-200'
                    }`}
                  >
                    {ranking.displayName}
                    {isCurrentUser && ' (du)'}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    isCurrentUser
                      ? 'text-emerald-400'
                      : isTopRanked
                        ? 'text-amber-400'
                        : 'text-slate-200'
                  }`}
                >
                  {Math.round(ranking.score)}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Expanded breakdown */}
              {isExpanded && (
                <div className="px-5 py-3 bg-slate-800/50 space-y-2">
                  <ScoreBar
                    label="EP"
                    percentage="35%"
                    value={epNorm}
                    color="bg-blue-500"
                  />
                  <ScoreBar
                    label="Streak"
                    percentage="20%"
                    value={streakNorm}
                    color="bg-green-500"
                  />
                  <ScoreBar
                    label="Boss DMG"
                    percentage="25%"
                    value={damageNorm}
                    color="bg-rose-500"
                  />
                  <ScoreBar
                    label="Konsistens"
                    percentage="20%"
                    value={consistencyNorm}
                    color="bg-purple-500"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
