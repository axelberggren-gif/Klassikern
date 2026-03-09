'use client';

interface DamageEntry {
  userId: string;
  displayName: string;
  totalDamage: number;
}

interface DamageLeaderboardProps {
  entries: DamageEntry[];
  currentUserId: string;
}

function getMedalEmoji(index: number): string {
  if (index === 0) return '\u{1F947}';
  if (index === 1) return '\u{1F948}';
  if (index === 2) return '\u{1F949}';
  return `${index + 1}.`;
}

export default function DamageLeaderboard({ entries, currentUserId }: DamageLeaderboardProps) {
  const sorted = [...entries].sort((a, b) => b.totalDamage - a.totalDamage);
  const top5 = sorted.slice(0, 5);

  if (top5.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-center">
        <p className="text-xs text-slate-400">Ingen skada ännu denna vecka</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Skada denna vecka
        </h3>
      </div>
      <div className="divide-y divide-slate-800">
        {top5.map((entry, index) => {
          const isCurrentUser = entry.userId === currentUserId;
          return (
            <div
              key={entry.userId}
              className={`flex items-center gap-3 px-4 py-2.5 ${
                isCurrentUser ? 'bg-emerald-500/10' : ''
              }`}
            >
              <span className="w-7 text-center text-sm font-bold text-slate-200">
                {getMedalEmoji(index)}
              </span>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                isCurrentUser ? 'bg-emerald-500' : 'bg-slate-600'
              }`}>
                {entry.displayName.charAt(0)}
              </div>
              <span className={`flex-1 text-sm font-medium truncate ${
                isCurrentUser ? 'text-emerald-400' : 'text-slate-200'
              }`}>
                {entry.displayName}
                {isCurrentUser && ' (du)'}
              </span>
              <span className={`text-sm font-bold tabular-nums ${
                isCurrentUser ? 'text-emerald-400' : 'text-slate-200'
              }`}>
                {entry.totalDamage} DMG
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
