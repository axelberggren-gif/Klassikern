'use client';

import { useState } from 'react';
import type { BossEncounterWithBoss } from '@/types/database';

interface BossTimelineProps {
  history: BossEncounterWithBoss[];
  currentEncounter: BossEncounterWithBoss | null;
  currentWeek: number;
}

export default function BossTimeline({ history, currentEncounter, currentWeek }: BossTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Build timeline nodes: past encounters + current + future placeholder
  const nodes: {
    id: string | null;
    emoji: string;
    name: string;
    week: number;
    status: 'defeated' | 'failed' | 'active' | 'unknown';
    defeatText: string | null;
    critSecret: string | null;
    lore: string | null;
  }[] = [];

  // Sort history by week_start ascending
  const sorted = [...history].sort((a, b) => a.week_start.localeCompare(b.week_start));
  for (const enc of sorted) {
    nodes.push({
      id: enc.id,
      emoji: enc.boss.emoji,
      name: enc.boss.name,
      week: enc.boss.level,
      status: enc.status as 'defeated' | 'failed',
      defeatText: enc.defeat_text ?? null,
      critSecret: enc.crit_secret ?? null,
      lore: enc.boss.lore,
    });
  }

  // Current encounter
  if (currentEncounter) {
    nodes.push({
      id: currentEncounter.id,
      emoji: currentEncounter.boss.emoji,
      name: currentEncounter.boss.name,
      week: currentWeek,
      status: 'active',
      defeatText: null,
      critSecret: null,
      lore: currentEncounter.boss.lore,
    });
  }

  // Future placeholder
  nodes.push({
    id: null,
    emoji: '❓',
    name: '???',
    week: currentWeek + 1,
    status: 'unknown',
    defeatText: null,
    critSecret: null,
    lore: null,
  });

  const expanded = expandedId ? nodes.find((n) => n.id === expandedId) : null;

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
            <button
              onClick={() => {
                if (node.id && (node.status === 'defeated' || node.status === 'failed')) {
                  setExpandedId(expandedId === node.id ? null : node.id);
                }
              }}
              className={`flex flex-col items-center gap-1 flex-shrink-0 rounded-xl px-2.5 py-2 transition-all ${
                node.status === 'active'
                  ? 'bg-amber-400/15 ring-1 ring-amber-400/50'
                  : node.status === 'defeated'
                    ? expandedId === node.id
                      ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50'
                      : 'bg-emerald-500/10'
                    : node.status === 'failed'
                      ? expandedId === node.id
                        ? 'bg-rose-500/20 ring-1 ring-rose-500/50'
                        : 'bg-rose-500/10'
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
            </button>
          </div>
        ))}
      </div>

      {/* Expanded defeat card */}
      {expanded && (
        <div className="mt-3 animate-slide-up">
          <div className={`rounded-xl border p-4 ${
            expanded.status === 'defeated'
              ? 'bg-slate-800/50 border-emerald-500/30'
              : 'bg-slate-800/50 border-rose-500/30'
          }`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{expanded.emoji}</span>
              <div>
                <h3 className="text-sm font-bold text-slate-50">{expanded.name}</h3>
                <span className={`text-[10px] font-bold uppercase ${
                  expanded.status === 'defeated' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {expanded.status === 'defeated' ? '☠️ Besegrad' : '💀 Misslyckad'}
                </span>
              </div>
            </div>

            {/* Lore */}
            {expanded.lore && (
              <p className="text-xs text-slate-400 italic mb-3 leading-relaxed">
                {expanded.lore}
              </p>
            )}

            {/* Defeat text */}
            {expanded.defeatText && (
              <div className="bg-slate-900/60 rounded-lg p-3 mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Sista ord
                </p>
                <p className="text-xs text-slate-200 italic leading-relaxed">
                  &ldquo;{expanded.defeatText}&rdquo;
                </p>
              </div>
            )}

            {/* Secret weakness */}
            {expanded.critSecret && (
              <div className="bg-violet-900/30 border border-violet-500/20 rounded-lg p-3">
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1">
                  🔮 Hemlig svaghet
                </p>
                <p className="text-xs text-violet-200 leading-relaxed">
                  {expanded.critSecret}
                </p>
              </div>
            )}

            {/* No defeat text for failed bosses */}
            {expanded.status === 'failed' && !expanded.defeatText && (
              <p className="text-xs text-rose-400/60 italic">
                Bossen överlevde veckan... ingen hemlighet avslöjad.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
