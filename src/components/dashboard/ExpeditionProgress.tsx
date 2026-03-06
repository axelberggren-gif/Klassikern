'use client';

import { MapPin, Mountain } from 'lucide-react';
import type { Profile } from '@/types/database';
import { EXPEDITION_WAYPOINTS } from '@/lib/expedition-waypoints';

interface ExpeditionProgressProps {
  users: Profile[];
  currentUserId: string;
}

export default function ExpeditionProgress({ users, currentUserId }: ExpeditionProgressProps) {
  const currentUser = users.find((u) => u.id === currentUserId);
  const totalEP = currentUser?.total_ep || 0;
  const maxEP = EXPEDITION_WAYPOINTS[EXPEDITION_WAYPOINTS.length - 1].ep_threshold;

  // Find current and next waypoint
  const currentWaypoint = [...EXPEDITION_WAYPOINTS].reverse().find((w) => totalEP >= w.ep_threshold) || EXPEDITION_WAYPOINTS[0];
  const nextWaypoint = EXPEDITION_WAYPOINTS.find((w) => w.ep_threshold > totalEP);

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
