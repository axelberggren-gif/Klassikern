'use client';

import { useState } from 'react';
import { Mountain, MapPin, Bike, Waves, TreePine } from 'lucide-react';
import type { Profile, BossEncounterWithBoss } from '@/types/database';
import { EXPEDITION_WAYPOINTS } from '@/lib/expedition-waypoints';

interface ExpeditionMapProps {
  users: Profile[];
  currentUserId: string;
  activeBoss?: BossEncounterWithBoss | null;
}

// Simplified Sweden outline path (stylized, fits a 100x100 viewbox)
const SWEDEN_PATH =
  'M 55,2 L 58,5 60,4 63,6 65,5 66,8 64,12 62,14 60,13 58,15 ' +
  'L 56,14 54,16 55,18 58,20 60,22 62,21 64,23 66,25 68,24 ' +
  'L 70,27 68,30 66,33 68,35 70,38 69,40 67,42 68,45 70,48 ' +
  'L 68,50 66,52 64,50 62,48 63,46 65,47 ' +
  'L 63,44 60,46 58,48 56,50 54,52 52,55 50,58 48,60 ' +
  'L 46,58 44,56 42,54 40,52 38,50 36,48 34,46 ' +
  'L 32,44 30,42 28,40 27,38 28,36 30,34 32,32 ' +
  'L 34,30 36,28 38,26 40,24 42,22 44,20 46,18 ' +
  'L 44,16 42,14 40,12 38,10 36,8 38,6 40,5 ' +
  'L 42,4 44,3 46,2 48,1 50,2 52,1 55,2 Z';

// Race waypoint icons
function getWaypointIcon(name: string) {
  if (name.includes('Mora')) return 'ski'; // Vasaloppet
  if (name.includes('Vätternrundan')) return 'bike'; // Cycling
  if (name.includes('Simningen')) return 'swim'; // Swimming
  if (name.includes('Loppet')) return 'run'; // Running
  return null;
}

// Color palette for user avatars
const AVATAR_COLORS = [
  'rgb(249, 115, 22)', // orange-500
  'rgb(99, 102, 241)',  // indigo-500
  'rgb(16, 185, 129)',  // emerald-500
  'rgb(236, 72, 153)',  // pink-500
  'rgb(245, 158, 11)',  // amber-500
  'rgb(139, 92, 246)',  // violet-500
];

export default function ExpeditionMap({ users, currentUserId, activeBoss }: ExpeditionMapProps) {
  const [selectedWaypoint, setSelectedWaypoint] = useState<number | null>(null);

  const currentUser = users.find((u) => u.id === currentUserId);
  const totalEP = currentUser?.total_ep || 0;
  const maxEP = EXPEDITION_WAYPOINTS[EXPEDITION_WAYPOINTS.length - 1].ep_threshold;

  // Current and next waypoint for the current user
  const currentWaypoint =
    [...EXPEDITION_WAYPOINTS].reverse().find((w) => totalEP >= w.ep_threshold) ||
    EXPEDITION_WAYPOINTS[0];
  const nextWaypoint = EXPEDITION_WAYPOINTS.find((w) => w.ep_threshold > totalEP);

  // Build the route path string connecting all waypoints
  const routePath = EXPEDITION_WAYPOINTS.map((w, i) =>
    `${i === 0 ? 'M' : 'L'} ${w.map_x},${w.map_y}`
  ).join(' ');

  // Calculate position along the route for a given EP
  function getPositionForEP(ep: number) {
    const clampedEP = Math.min(ep, maxEP);
    // Find which segment the user is on
    for (let i = 0; i < EXPEDITION_WAYPOINTS.length - 1; i++) {
      const curr = EXPEDITION_WAYPOINTS[i];
      const next = EXPEDITION_WAYPOINTS[i + 1];
      if (clampedEP >= curr.ep_threshold && clampedEP < next.ep_threshold) {
        const t = (clampedEP - curr.ep_threshold) / (next.ep_threshold - curr.ep_threshold);
        return {
          x: curr.map_x + (next.map_x - curr.map_x) * t,
          y: curr.map_y + (next.map_y - curr.map_y) * t,
        };
      }
    }
    // At or past the last waypoint
    const last = EXPEDITION_WAYPOINTS[EXPEDITION_WAYPOINTS.length - 1];
    return { x: last.map_x, y: last.map_y };
  }

  // Segment progress for the info bar
  const segmentProgress = nextWaypoint
    ? ((totalEP - currentWaypoint.ep_threshold) / (nextWaypoint.ep_threshold - currentWaypoint.ep_threshold)) * 100
    : 100;

  const selected = selectedWaypoint !== null
    ? EXPEDITION_WAYPOINTS.find((w) => w.id === selectedWaypoint)
    : null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain size={18} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-indigo-700">Expeditionen</h3>
        </div>
        <span className="text-xs font-medium text-indigo-500">{totalEP} / {maxEP} EP</span>
      </div>

      {/* SVG Map */}
      <div className="relative px-2">
        <svg
          viewBox="20 -2 60 68"
          className="w-full h-auto"
          style={{ maxHeight: '320px' }}
        >
          {/* Sweden silhouette */}
          <path
            d={SWEDEN_PATH}
            fill="rgb(224, 231, 255)"
            stroke="rgb(165, 180, 252)"
            strokeWidth="0.5"
            opacity="0.6"
          />

          {/* Route path (full, dimmed) */}
          <path
            d={routePath}
            fill="none"
            stroke="rgb(199, 210, 254)"
            strokeWidth="0.8"
            strokeDasharray="2,1.5"
            strokeLinecap="round"
          />

          {/* Route path (traveled, highlighted) */}
          {(() => {
            // Build a path up to the current user's position
            const pos = getPositionForEP(totalEP);
            const traveledSegments: string[] = [];
            for (let i = 0; i < EXPEDITION_WAYPOINTS.length; i++) {
              const w = EXPEDITION_WAYPOINTS[i];
              if (w.ep_threshold <= totalEP) {
                traveledSegments.push(`${i === 0 ? 'M' : 'L'} ${w.map_x},${w.map_y}`);
              } else {
                // Add the interpolated current position
                traveledSegments.push(`L ${pos.x},${pos.y}`);
                break;
              }
            }
            return (
              <path
                d={traveledSegments.join(' ')}
                fill="none"
                stroke="rgb(249, 115, 22)"
                strokeWidth="1.2"
                strokeLinecap="round"
                className="drop-shadow-sm"
              />
            );
          })()}

          {/* Waypoint markers */}
          {EXPEDITION_WAYPOINTS.map((w) => {
            const reached = totalEP >= w.ep_threshold;
            const isCurrent = w.id === currentWaypoint.id;
            const isRace = getWaypointIcon(w.name) !== null;
            const isSelected = selectedWaypoint === w.id;

            return (
              <g
                key={w.id}
                className="cursor-pointer"
                onClick={() => setSelectedWaypoint(isSelected ? null : w.id)}
              >
                {/* Pulse ring for current waypoint */}
                {isCurrent && (
                  <circle
                    cx={w.map_x}
                    cy={w.map_y}
                    r="2.5"
                    fill="none"
                    stroke="rgb(249, 115, 22)"
                    strokeWidth="0.4"
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      from="1.5"
                      to="3.5"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.6"
                      to="0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Waypoint dot */}
                <circle
                  cx={w.map_x}
                  cy={w.map_y}
                  r={isRace ? 2 : 1.3}
                  fill={reached ? (isRace ? 'rgb(249, 115, 22)' : 'rgb(99, 102, 241)') : 'rgb(209, 213, 219)'}
                  stroke="white"
                  strokeWidth="0.5"
                />

                {/* Race icon indicators */}
                {isRace && (
                  <circle
                    cx={w.map_x}
                    cy={w.map_y}
                    r="3"
                    fill="none"
                    stroke={reached ? 'rgb(249, 115, 22)' : 'rgb(209, 213, 219)'}
                    strokeWidth="0.3"
                    strokeDasharray="1,0.5"
                  />
                )}

                {/* Waypoint label */}
                {(isRace || isCurrent || isSelected) && (
                  <text
                    x={w.map_x}
                    y={w.map_y - (isRace ? 4.5 : 3)}
                    textAnchor="middle"
                    fontSize="2"
                    fontWeight={isCurrent ? 'bold' : 'normal'}
                    fill={reached ? 'rgb(55, 65, 81)' : 'rgb(156, 163, 175)'}
                    className="select-none"
                  >
                    {w.name.replace(/ – .*/, '')}
                  </text>
                )}
              </g>
            );
          })}

          {/* Boss marker at next waypoint */}
          {activeBoss && activeBoss.status === 'active' && nextWaypoint && (() => {
            const bossHp = activeBoss.max_hp > 0
              ? Math.round((activeBoss.current_hp / activeBoss.max_hp) * 100)
              : 0;
            const isLowHp = bossHp < 30;
            return (
              <g>
                {/* Outer danger ring pulse */}
                <circle
                  cx={nextWaypoint.map_x}
                  cy={nextWaypoint.map_y}
                  r="3"
                  fill="none"
                  stroke="rgb(239, 68, 68)"
                  strokeWidth="0.4"
                >
                  <animate attributeName="r" from="2" to="6" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                </circle>
                {/* Inner danger ring (staggered) */}
                <circle
                  cx={nextWaypoint.map_x}
                  cy={nextWaypoint.map_y}
                  r="2"
                  fill="none"
                  stroke={isLowHp ? 'rgb(245, 158, 11)' : 'rgb(239, 68, 68)'}
                  strokeWidth="0.3"
                >
                  <animate attributeName="r" from="1.5" to="4.5" dur="1.5s" begin="0.75s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" begin="0.75s" repeatCount="indefinite" />
                </circle>
                {/* Dark backing circle for boss */}
                <circle
                  cx={nextWaypoint.map_x}
                  cy={nextWaypoint.map_y}
                  r="3.5"
                  fill="rgba(15, 23, 42, 0.7)"
                  stroke={isLowHp ? 'rgb(245, 158, 11)' : 'rgb(239, 68, 68)'}
                  strokeWidth="0.4"
                />
                {/* Boss emoji */}
                <text
                  x={nextWaypoint.map_x}
                  y={nextWaypoint.map_y + 1.8}
                  textAnchor="middle"
                  fontSize="5.5"
                  className="select-none"
                >
                  <animate
                    attributeName="y"
                    values={`${nextWaypoint.map_y + 1.8};${nextWaypoint.map_y + 0.8};${nextWaypoint.map_y + 1.8}`}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  {activeBoss.boss.emoji}
                </text>
                {/* Mini HP bar under boss */}
                <rect
                  x={nextWaypoint.map_x - 4}
                  y={nextWaypoint.map_y + 4}
                  width="8"
                  height="1"
                  rx="0.5"
                  fill="rgba(0,0,0,0.3)"
                />
                <rect
                  x={nextWaypoint.map_x - 4}
                  y={nextWaypoint.map_y + 4}
                  width={8 * (bossHp / 100)}
                  height="1"
                  rx="0.5"
                  fill={isLowHp ? 'rgb(245, 158, 11)' : 'rgb(239, 68, 68)'}
                />
              </g>
            );
          })()}

          {/* Group member markers */}
          {users.map((user, idx) => {
            const pos = getPositionForEP(user.total_ep);
            const isCurrentUser = user.id === currentUserId;
            const color = isCurrentUser ? AVATAR_COLORS[0] : AVATAR_COLORS[(idx % (AVATAR_COLORS.length - 1)) + 1];

            return (
              <g key={user.id}>
                {/* Shadow */}
                <ellipse
                  cx={pos.x}
                  cy={pos.y + 1.8}
                  rx="1.5"
                  ry="0.5"
                  fill="rgba(0,0,0,0.1)"
                />
                {/* Avatar circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isCurrentUser ? 2.2 : 1.8}
                  fill={color}
                  stroke="white"
                  strokeWidth={isCurrentUser ? 0.7 : 0.5}
                  className="drop-shadow-sm"
                >
                  {/* Subtle bob animation */}
                  <animate
                    attributeName="cy"
                    values={`${pos.y};${pos.y - 0.4};${pos.y}`}
                    dur={`${2.5 + idx * 0.3}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                {/* Initial letter */}
                <text
                  x={pos.x}
                  y={pos.y + 0.7}
                  textAnchor="middle"
                  fontSize={isCurrentUser ? '2.2' : '1.8'}
                  fontWeight="bold"
                  fill="white"
                  className="select-none pointer-events-none"
                >
                  <animate
                    attributeName="y"
                    values={`${pos.y + 0.7};${pos.y + 0.3};${pos.y + 0.7}`}
                    dur={`${2.5 + idx * 0.3}s`}
                    repeatCount="indefinite"
                  />
                  {user.display_name.charAt(0)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Waypoint info tooltip */}
      {selected && (
        <div className="mx-4 mb-2 rounded-xl bg-white/80 backdrop-blur-sm border border-indigo-100 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            {getWaypointIcon(selected.name) === 'bike' && <Bike size={14} className="text-orange-500" />}
            {getWaypointIcon(selected.name) === 'swim' && <Waves size={14} className="text-blue-500" />}
            {getWaypointIcon(selected.name) === 'run' && <TreePine size={14} className="text-green-600" />}
            {getWaypointIcon(selected.name) === 'ski' && <Mountain size={14} className="text-indigo-500" />}
            {!getWaypointIcon(selected.name) && <MapPin size={14} className="text-gray-400" />}
            <span className="text-sm font-semibold text-gray-800">{selected.name}</span>
          </div>
          <p className="text-xs text-gray-500">{selected.description}</p>
          <p className="text-xs text-indigo-500 mt-1 font-medium">{selected.ep_threshold} EP</p>
        </div>
      )}

      {/* Progress info bar */}
      <div className="px-5 pb-4 pt-2">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={14} className="text-orange-500" fill="currentColor" />
          <span className="text-sm font-bold text-gray-800">{currentWaypoint.name}</span>
        </div>

        {nextWaypoint && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>Nästa: {nextWaypoint.name}</span>
              <span>{nextWaypoint.ep_threshold - totalEP} EP kvar</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all duration-700"
                style={{ width: `${segmentProgress}%` }}
              />
            </div>
          </div>
        )}

        {!nextWaypoint && (
          <p className="text-xs text-green-600 font-semibold">
            Expeditionen avklarad! Du är en Svensk Klassiker!
          </p>
        )}

        {/* Boss blocking path */}
        {activeBoss && activeBoss.status === 'active' && nextWaypoint && (() => {
          const hp = activeBoss.max_hp > 0 ? Math.round((activeBoss.current_hp / activeBoss.max_hp) * 100) : 0;
          const lowHp = hp < 30;
          return (
            <div className={`mt-2 rounded-xl border px-3 py-3 flex items-center gap-3 ${
              lowHp
                ? 'bg-gradient-to-r from-amber-50 to-red-50 border-amber-300'
                : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
            }`}>
              <div className="relative flex-shrink-0">
                <span className="text-3xl block">{activeBoss.boss.emoji}</span>
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                  {activeBoss.boss.level}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-red-800 truncate">
                  {activeBoss.boss.name}
                </p>
                <p className="text-[10px] text-red-600 truncate">
                  Blockerar vägen till {nextWaypoint.name}
                </p>
                <div className="mt-1.5 h-2 w-full rounded-full bg-red-200 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      lowHp
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                        : 'bg-gradient-to-r from-red-500 to-orange-500'
                    }`}
                    style={{ width: `${hp}%` }}
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <p className="text-[10px] text-red-400">
                    {activeBoss.current_hp} / {activeBoss.max_hp} HP
                  </p>
                  <p className="text-[10px] font-semibold text-red-500">{hp}%</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Group member legend */}
        <div className="mt-3 flex flex-wrap gap-2">
          {users.map((user, idx) => {
            const isCurrentUser = user.id === currentUserId;
            const color = isCurrentUser ? AVATAR_COLORS[0] : AVATAR_COLORS[(idx % (AVATAR_COLORS.length - 1)) + 1];
            return (
              <div key={user.id} className="flex items-center gap-1">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className={`text-xs ${isCurrentUser ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                  {user.display_name} ({user.total_ep})
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
