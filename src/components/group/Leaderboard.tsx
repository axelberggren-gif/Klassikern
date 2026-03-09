'use client';

import type { Profile } from '@/types/database';

export interface LeaderboardConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  getValue: (user: Profile) => number;
  formatValue: (value: number) => string;
}

function getMedalEmoji(index: number): string {
  if (index === 0) return '\u{1F947}';
  if (index === 1) return '\u{1F948}';
  if (index === 2) return '\u{1F949}';
  return `${index + 1}.`;
}

interface LeaderboardProps {
  users: Profile[];
  config: LeaderboardConfig;
  currentUserId: string;
}

export default function Leaderboard({ users, config, currentUserId }: LeaderboardProps) {
  const sorted = [...users].sort((a, b) => config.getValue(b) - config.getValue(a));

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
        {config.icon}
        <h3 className="text-sm font-semibold text-slate-200">{config.label}</h3>
      </div>
      <div className="divide-y divide-slate-800">
        {sorted.map((user, index) => {
          const value = config.getValue(user);
          const isCurrentUser = user.id === currentUserId;

          return (
            <div
              key={user.id}
              className={`flex items-center gap-3 px-5 py-3 ${isCurrentUser ? 'bg-emerald-500/10' : ''}`}
            >
              <span className="w-8 text-center text-sm font-bold text-slate-200">{getMedalEmoji(index)}</span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                  isCurrentUser ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              >
                {user.display_name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isCurrentUser ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {user.display_name}
                  {isCurrentUser && ' (du)'}
                </p>
              </div>
              <span className={`text-sm font-bold ${isCurrentUser ? 'text-emerald-400' : 'text-slate-200'}`}>
                {config.formatValue(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
