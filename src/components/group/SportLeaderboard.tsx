'use client';

import { useState } from 'react';
import { Medal } from 'lucide-react';
import type { SportType } from '@/types/database';
import { SPORT_CONFIG } from '@/lib/sport-config';

interface SportLeaderboardEntry {
  userId: string;
  displayName: string;
  totalEP: number;
  totalMinutes: number;
  sessionCount: number;
}

interface SportLeaderboardProps {
  data: Map<SportType, SportLeaderboardEntry[]>;
  currentUserId: string;
}

const SPORT_TABS: SportType[] = ['cycling', 'running', 'swimming', 'hiit'];

function getMedalEmoji(index: number): string {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `${index + 1}`;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function SportLeaderboard({ data, currentUserId }: SportLeaderboardProps) {
  const [activeSport, setActiveSport] = useState<SportType>('cycling');

  const entries = data.get(activeSport) ?? [];
  const sorted = [...entries].sort((a, b) => b.totalEP - a.totalEP);

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
        <Medal className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-200">Sporttoppen</h3>
      </div>

      {/* Sport tabs */}
      <div className="flex border-b border-slate-700">
        {SPORT_TABS.map((sport) => {
          const config = SPORT_CONFIG[sport];
          const isActive = sport === activeSport;

          return (
            <button
              key={sport}
              onClick={() => setActiveSport(sport)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/50'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              <span className="text-sm">{config.icon}</span>
              <span className="hidden sm:inline">{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Leaderboard rows */}
      <div className="divide-y divide-slate-800">
        {sorted.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-slate-500">
            Inga pass loggade i {SPORT_CONFIG[activeSport].label.toLowerCase()}
          </div>
        )}
        {sorted.map((entry, index) => {
          const isCurrentUser = entry.userId === currentUserId;

          return (
            <div
              key={entry.userId}
              className={`flex items-center gap-3 px-5 py-3 ${
                isCurrentUser ? 'bg-emerald-500/10' : ''
              }`}
            >
              <span className="w-7 text-center text-sm font-bold text-slate-200">
                {getMedalEmoji(index)}
              </span>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 ${
                  isCurrentUser ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              >
                {entry.displayName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    isCurrentUser ? 'text-emerald-400' : 'text-slate-200'
                  }`}
                >
                  {entry.displayName}
                  {isCurrentUser && ' (du)'}
                </p>
                <p className="text-xs text-slate-500">
                  {entry.sessionCount} pass &middot; {formatMinutes(entry.totalMinutes)}
                </p>
              </div>
              <span
                className={`text-sm font-bold tabular-nums ${
                  isCurrentUser ? 'text-emerald-400' : 'text-slate-200'
                }`}
              >
                {entry.totalEP} EP
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
