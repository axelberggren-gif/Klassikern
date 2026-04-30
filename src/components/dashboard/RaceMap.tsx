'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bike, Flag } from 'lucide-react';
import type { Profile } from '@/types/database';

const TOTAL_KM = 1000;
const VIEWBOX_W = 800;
const VIEWBOX_H = 420;

// Meandering "Irish country road" — drawn as a single cubic bezier path so that
// SVGPathElement.getPointAtLength() can be used to place icons along the curve.
const ROAD_PATH =
  'M 50 360 ' +
  'C 140 360, 160 240, 230 230 ' +
  'S 360 360, 430 310 ' +
  'S 560 130, 620 180 ' +
  'S 720 280, 760 60';

const MILESTONES: { km: number; name: string; emoji: string }[] = [
  { km: 150, name: 'Fenrirsbo', emoji: '🐺' },
  { km: 350, name: 'Jörmungandsvik', emoji: '🌊' },
  { km: 550, name: 'Surts Eldhult', emoji: '☄️' },
  { km: 750, name: 'Ragnaröksköping', emoji: '⚡' },
  { km: 950, name: 'Yggdrasilstorp', emoji: '🌳' },
];

type Point = { x: number; y: number };

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export default function RaceMap({
  members,
  distances,
  currentUserId,
}: {
  members: Profile[];
  distances: Map<string, number>;
  currentUserId: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(0);
  const [endPoint, setEndPoint] = useState<Point>({ x: 760, y: 60 });

  useEffect(() => {
    if (!pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    setPathLen(len);
    const end = pathRef.current.getPointAtLength(len);
    setEndPoint({ x: end.x, y: end.y });
  }, []);

  const pointAt = (progress: number): Point => {
    const path = pathRef.current;
    if (!path || pathLen === 0) return { x: 50, y: 360 };
    const p = path.getPointAtLength(clamp01(progress) * pathLen);
    return { x: p.x, y: p.y };
  };

  const milestonePoints = useMemo(
    () => MILESTONES.map((m) => pointAt(m.km / TOTAL_KM)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathLen]
  );

  // Sorted by km descending so leader is first → highest z-index in SVG order
  const memberPositions = useMemo(() => {
    const list = members.map((m) => {
      const km = Math.max(0, distances.get(m.id) ?? 0);
      return { member: m, km, progress: clamp01(km / TOTAL_KM) };
    });
    list.sort((a, b) => a.km - b.km);
    return list.map((entry) => ({ ...entry, point: pointAt(entry.progress) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, distances, pathLen]);

  const leader = useMemo(() => {
    if (memberPositions.length === 0) return null;
    return memberPositions[memberPositions.length - 1];
  }, [memberPositions]);

  const currentUserKm = distances.get(currentUserId) ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 via-slate-900 to-emerald-950/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bike size={16} className="text-amber-400" />
          <h3 className="text-sm font-bold text-slate-50">Cykellopp 2026</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Du</p>
          <p className="text-sm font-bold text-amber-400">
            {Math.round(currentUserKm)} / {TOTAL_KM} km
          </p>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="road-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#fb923c" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
            </linearGradient>
            <pattern
              id="road-dashes"
              width="14"
              height="2"
              patternUnits="userSpaceOnUse"
            >
              <rect width="7" height="2" fill="#fde68a" opacity="0.85" />
            </pattern>
          </defs>

          {/* Road shadow */}
          <path
            d={ROAD_PATH}
            stroke="#000"
            strokeOpacity="0.35"
            strokeWidth="22"
            fill="none"
            strokeLinecap="round"
            transform="translate(2 4)"
          />
          {/* Road base */}
          <path
            ref={pathRef}
            d={ROAD_PATH}
            stroke="url(#road-gradient)"
            strokeWidth="20"
            fill="none"
            strokeLinecap="round"
          />
          {/* Center dashed line */}
          <path
            d={ROAD_PATH}
            stroke="url(#road-dashes)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="6 8"
          />

          {/* Start marker */}
          <g transform="translate(50 360)">
            <circle r="14" fill="#10b981" stroke="#064e3b" strokeWidth="2" />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="14"
              fontWeight="700"
              fill="#fff"
            >
              0
            </text>
            <text
              x="0"
              y="32"
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="#a7f3d0"
            >
              START
            </text>
          </g>

          {/* Finish marker */}
          <g transform={`translate(${endPoint.x} ${endPoint.y})`}>
            <circle r="16" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="14"
            >
              🏁
            </text>
            <text
              x="0"
              y="-26"
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="#fde68a"
            >
              MÅL · 1000 km
            </text>
          </g>

          {/* Milestones */}
          {milestonePoints.map((pt, i) => {
            const m = MILESTONES[i];
            const labelAbove = i % 2 === 0;
            return (
              <g key={m.km} transform={`translate(${pt.x} ${pt.y})`}>
                <circle r="11" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="11"
                >
                  {m.emoji}
                </text>
                <text
                  x="0"
                  y={labelAbove ? -18 : 24}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="#fde68a"
                >
                  {m.name}
                </text>
                <text
                  x="0"
                  y={labelAbove ? -8 : 34}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#94a3b8"
                >
                  {m.km} km
                </text>
              </g>
            );
          })}

          {/* Member icons (rendered last so they appear on top of road/milestones) */}
          {memberPositions.map(({ member, point, km }) => {
            const ringColor = member.icon_color || '#f97316';
            const isMe = member.id === currentUserId;
            const isLeader = leader?.member.id === member.id && km > 0;
            const initial = member.display_name.charAt(0).toUpperCase();
            const hasAvatar = !!member.avatar_url;
            const clipId = `clip-${member.id}`;
            return (
              <g
                key={member.id}
                transform={`translate(${point.x} ${point.y})`}
              >
                {isLeader && (
                  <circle
                    r="22"
                    fill="none"
                    stroke="#fde047"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.7"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0"
                      to="360"
                      dur="8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {/* Ring */}
                <circle r="17" fill={ringColor} />
                {/* White spacer */}
                <circle r="14" fill="#0f172a" />
                {/* Avatar fill */}
                {hasAvatar ? (
                  <>
                    <defs>
                      <clipPath id={clipId}>
                        <circle r="13" />
                      </clipPath>
                    </defs>
                    <image
                      href={member.avatar_url ?? undefined}
                      x="-13"
                      y="-13"
                      width="26"
                      height="26"
                      clipPath={`url(#${clipId})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </>
                ) : (
                  <>
                    <circle r="13" fill="#1e293b" />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="14"
                      fontWeight="700"
                      fill="#f8fafc"
                    >
                      {initial}
                    </text>
                  </>
                )}
                {/* Name label */}
                <text
                  x="0"
                  y="32"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={isMe ? 700 : 600}
                  fill={isMe ? '#fbbf24' : '#e2e8f0'}
                  stroke="#0f172a"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {member.display_name}
                  {isMe ? ' (du)' : ''}
                </text>
                <text
                  x="0"
                  y="44"
                  textAnchor="middle"
                  fontSize="9"
                  fill="#94a3b8"
                  stroke="#0f172a"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {Math.round(km)} km
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mini leaderboard under the map */}
      <div className="mt-3 grid grid-cols-1 gap-1.5">
        {[...memberPositions]
          .reverse()
          .slice(0, 5)
          .map(({ member, km }, idx) => {
            const isMe = member.id === currentUserId;
            const ringColor = member.icon_color || '#f97316';
            return (
              <div
                key={member.id}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                  isMe ? 'bg-amber-500/10' : 'bg-slate-900/60'
                }`}
              >
                <span className="w-5 text-center text-[11px] font-bold text-slate-400">
                  {idx + 1}
                </span>
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
                >
                  {member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-200 bg-slate-700 h-full w-full flex items-center justify-center">
                      {member.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span
                  className={`flex-1 truncate text-xs font-medium ${
                    isMe ? 'text-amber-400' : 'text-slate-200'
                  }`}
                >
                  {member.display_name}
                  {isMe && ' (du)'}
                </span>
                {km >= TOTAL_KM ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <Flag size={12} /> Mål!
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-300">
                    {Math.round(km)} km
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
