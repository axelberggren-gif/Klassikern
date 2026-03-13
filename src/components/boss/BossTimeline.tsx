'use client';

import type { BossEncounterWithBoss } from '@/types/database';

interface BossTimelineProps {
  history: BossEncounterWithBoss[];
  currentEncounter: BossEncounterWithBoss | null;
  currentWeek: number;
}

export default function BossTimeline({ history, currentEncounter, currentWeek }: BossTimelineProps) {
  // Build timeline nodes: past encounters + current + future placeholder
  const nodes: {
    emoji: string;
    week: number;
    status: 'defeated' | 'failed' | 'active' | 'unknown';
  }[] = [];

  // Sort history by week_start ascending
  const sorted = [...history].sort((a, b) => a.week_start.localeCompare(b.week_start));
  for (const enc of sorted) {
    nodes.push({
      emoji: enc.boss.emoji,
      week: enc.boss.level,
      status: enc.status as 'defeated' | 'failed',
    });
  }

  // Current encounter
  if (currentEncounter) {
    nodes.push({
      emoji: currentEncounter.boss.emoji,
      week: currentWeek,
      status: 'active',
    });
  }

  // Future placeholder
  nodes.push({
    emoji: '❓',
    week: currentWeek + 1,
    status: 'unknown',
  });

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
        Din resa
      </p>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {nodes.map((node, i) => (
          <div key={`${node.week}-${i}`} className="flex items-center">
            {i > 0 && (
              <div className={`h-0.5 w-4 flex-shrink-0 ${
                node.status === 'unknown' ? 'bg-slate-700' : 'bg-slate-600'
              }`} />
            )}
            <div
              className={`flex flex-col items-center gap-1 flex-shrink-0 rounded-xl px-2.5 py-2 ${
                node.status === 'active'
                  ? 'bg-amber-400/15 ring-1 ring-amber-400/50'
                  : node.status === 'defeated'
                    ? 'bg-emerald-500/10'
                    : node.status === 'failed'
                      ? 'bg-rose-500/10'
                      : 'bg-slate-800'
              }`}
            >
              <div className="relative">
                <span className="text-2xl">{node.emoji}</span>
                {node.status === 'defeated' && (
                  <span className="absolute -bottom-1 -right-1 text-xs">✅</span>
                )}
                {node.status === 'failed' && (
                  <span className="absolute -bottom-1 -right-1 text-xs">💀</span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${
                node.status === 'active' ? 'text-amber-400' : 'text-slate-400'
              }`}>
                V{node.week}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
