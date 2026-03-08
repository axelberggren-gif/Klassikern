'use client';

import { MapPin, Mountain } from 'lucide-react';
import type { Profile, BossEncounterWithBoss } from '@/types/database';
import { EXPEDITION_WAYPOINTS } from '@/lib/mock-data';
import { isLastStandWindow } from '@/lib/boss-engine';

interface ExpeditionProgressProps {
  users: Profile[];
  currentUserId: string;
  activeBoss?: BossEncounterWithBoss | null;
}

export default function ExpeditionProgress({ users, currentUserId, activeBoss }: ExpeditionProgressProps) {
  const currentUser = users.find((u) => u.id === currentUserId);
  const totalEP = currentUser?.total_ep || 0;
  const maxEP = EXPEDITION_WAYPOINTS[EXPEDITION_WAYPOINTS.length - 1].ep_threshold;

  // Find current and next waypoint
  const currentWaypoint = [...EXPEDITION_WAYPOINTS].reverse().find((w) => totalEP >= w.ep_threshold) || EXPEDITION_WAYPOINTS[0];
  const nextWaypoint = EXPEDITION_WAYPOINTS.find((w) => w.ep_threshold > totalEP);

  // Boss overlay state
  const hasBoss = activeBoss && activeBoss.status === 'active';
  const bossLastStand = hasBoss && isLastStandWindow(new Date(activeBoss.week_end));
  const bossHpPercent = hasBoss
    ? Math.round((activeBoss.current_hp / activeBoss.max_hp) * 100)
    : 0;

  const overallProgress = Math.min((totalEP / maxEP) * 100, 100);

  // Progress between current and next waypoint
  const segmentProgress = nextWaypoint
    ? ((totalEP - currentWaypoint.ep_threshold) / (nextWaypoint.ep_threshold - currentWaypoint.ep_threshold)) * 100
    : 100;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain size={18} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-indigo-700">Expeditionen</h3>
        </div>
        <span className="text-xs font-medium text-indigo-500">{totalEP} EP</span>
      </div>

      {/* Current location */}
      <div className="mb-3 flex items-center gap-2">
        <MapPin size={16} className="text-orange-500" fill="currentColor" />
        <span className="text-sm font-bold text-gray-800">{currentWaypoint.name}</span>
      </div>
      <p className="mb-4 text-xs text-gray-500">{currentWaypoint.description}</p>

      {/* Progress to next waypoint */}
      {nextWaypoint && (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>{currentWaypoint.name}</span>
            <span>{nextWaypoint.name}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all duration-700"
              style={{ width: `${segmentProgress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-gray-400">
            {nextWaypoint.ep_threshold - totalEP} EP kvar
          </p>
        </div>
      )}

      {/* Boss blocking the path */}
      {hasBoss && nextWaypoint && (() => {
        const lowHp = bossHpPercent < 30;
        return (
          <>
            <style>{`
              @keyframes boss-pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.15); }
              }
              @keyframes boss-border-glow {
                0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                50% { box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.3); }
              }
              .animate-boss-pulse { animation: boss-pulse 2s ease-in-out infinite; }
              .animate-boss-glow { animation: boss-border-glow 2s ease-in-out infinite; }
            `}</style>
            <div className={`mt-3 rounded-xl border p-3 ${
              lowHp
                ? 'bg-gradient-to-r from-amber-50 to-red-50 border-amber-300 animate-boss-glow'
                : 'bg-gradient-to-r from-red-50 to-red-100/50 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="animate-boss-pulse text-3xl select-none">
                    {activeBoss.boss.emoji}
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white shadow-sm">
                    {activeBoss.boss.level}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-red-800 truncate">
                      {activeBoss.boss.name}
                    </p>
                    {bossLastStand && (
                      <span className="inline-flex items-center rounded-full bg-red-200 px-1.5 py-0.5 text-[9px] font-bold text-red-800 animate-pulse whitespace-nowrap">
                        Last Stand!
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-red-600">
                    Blockerar vägen till {nextWaypoint.name}
                  </p>
                  {/* HP bar with percentage inside */}
                  <div className="mt-1.5 h-2.5 w-full rounded-full bg-red-200 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        lowHp
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                          : 'bg-gradient-to-r from-red-500 to-orange-500'
                      }`}
                      style={{ width: `${bossHpPercent}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white mix-blend-difference">
                      {bossHpPercent}%
                    </span>
                  </div>
                  <p className="text-[10px] text-red-400 mt-0.5">
                    {activeBoss.current_hp} / {activeBoss.max_hp} HP
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Overall journey progress */}
      <div className="mt-3 pt-3 border-t border-indigo-100/50">
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>Hela resan</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/60">
          <div
            className="h-full rounded-full bg-indigo-400 transition-all duration-700"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Group markers */}
      <div className="mt-4 flex items-center gap-1">
        {users.map((user) => {
          const userProgress = Math.min((user.total_ep / maxEP) * 100, 100);
          return (
            <div
              key={user.id}
              className="relative"
              style={{ left: `${userProgress}%` }}
              title={`${user.display_name}: ${user.total_ep} EP`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                  user.id === currentUserId ? 'bg-orange-500 ring-2 ring-orange-200' : 'bg-indigo-400'
                }`}
              >
                {user.display_name.charAt(0)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
