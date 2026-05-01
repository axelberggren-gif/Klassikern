'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bike, Flag } from 'lucide-react';
import type { Profile } from '@/types/database';

const TOTAL_KM = 1000;
const VIEWBOX_W = 400;
const VIEWBOX_H = 1600;

// Winding road from bottom (start) to top (finish) — tall, scroll-through layout.
const ROAD_PATH =
  'M 60 1560 ' +
  'C 180 1560, 340 1500, 340 1400 ' +
  'S 60 1280, 80 1180 ' +
  'S 340 1080, 320 980 ' +
  'S 70 880, 80 780 ' +
  'S 340 680, 320 580 ' +
  'S 70 480, 80 380 ' +
  'S 340 270, 320 180 ' +
  'S 200 90, 200 50';

const MILESTONES: { km: number; name: string; emoji: string }[] = [
  { km: 150, name: 'Fenrirsbo', emoji: '🐺' },
  { km: 350, name: 'Jörmungandsvik', emoji: '🌊' },
  { km: 550, name: 'Surts Eldhult', emoji: '☄️' },
  { km: 750, name: 'Ragnaröksköping', emoji: '⚡' },
  { km: 950, name: 'Yggdrasilstorp', emoji: '🌳' },
];

// Decorative scatter — pre-placed so layout is stable across renders.
const STARS = [
  { x: 40, y: 30, r: 1.2 },
  { x: 90, y: 80, r: 0.9 },
  { x: 140, y: 25, r: 1.4 },
  { x: 220, y: 60, r: 1 },
  { x: 280, y: 18, r: 1.1 },
  { x: 320, y: 95, r: 0.8 },
  { x: 360, y: 45, r: 1.3 },
  { x: 60, y: 130, r: 0.9 },
  { x: 180, y: 110, r: 1.1 },
  { x: 250, y: 145, r: 0.8 },
  { x: 30, y: 200, r: 1 },
  { x: 370, y: 220, r: 0.9 },
];

const TREES = [
  // Bottom meadow / start area
  { x: 25, y: 1530, h: 24, dark: false },
  { x: 200, y: 1545, h: 20, dark: false },
  { x: 360, y: 1520, h: 26, dark: true },
  { x: 380, y: 1480, h: 22, dark: false },
  { x: 20, y: 1450, h: 28, dark: true },
  // Lower forest
  { x: 60, y: 1380, h: 26, dark: true },
  { x: 220, y: 1330, h: 30, dark: false },
  { x: 380, y: 1320, h: 22, dark: false },
  { x: 30, y: 1280, h: 24, dark: true },
  { x: 360, y: 1250, h: 28, dark: true },
  { x: 180, y: 1230, h: 22, dark: false },
  { x: 250, y: 1180, h: 26, dark: false },
  { x: 20, y: 1130, h: 30, dark: true },
  // Mid forest band
  { x: 380, y: 1080, h: 24, dark: false },
  { x: 200, y: 1030, h: 28, dark: true },
  { x: 30, y: 990, h: 26, dark: false },
  { x: 360, y: 960, h: 22, dark: true },
  { x: 180, y: 920, h: 30, dark: false },
  { x: 60, y: 880, h: 24, dark: true },
  { x: 380, y: 850, h: 26, dark: false },
  { x: 220, y: 810, h: 22, dark: true },
  { x: 30, y: 780, h: 28, dark: false },
  { x: 380, y: 740, h: 24, dark: true },
  { x: 200, y: 700, h: 26, dark: false },
  // Sub-alpine
  { x: 50, y: 660, h: 22, dark: true },
  { x: 360, y: 620, h: 24, dark: false },
  { x: 180, y: 580, h: 20, dark: true },
  { x: 30, y: 540, h: 22, dark: false },
  { x: 380, y: 520, h: 18, dark: true },
  { x: 220, y: 490, h: 20, dark: false },
];

const HILLS = [
  // Far rolling hills behind the trees
  { cx: 80, cy: 1420, rx: 130, ry: 60 },
  { cx: 320, cy: 1380, rx: 150, ry: 70 },
  { cx: 200, cy: 1300, rx: 180, ry: 80 },
  { cx: 60, cy: 1180, rx: 140, ry: 70 },
  { cx: 340, cy: 1140, rx: 160, ry: 80 },
];

type Point = { x: number; y: number };

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function PineTree({ x, y, h, dark }: { x: number; y: number; h: number; dark: boolean }) {
  const trunkColor = '#4b2e1a';
  const leafColor = dark ? '#0f3a2a' : '#1f6b4a';
  const leafLight = dark ? '#1c5a3f' : '#2f8b62';
  const w = h * 0.6;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-1.5} y={-h * 0.2} width={3} height={h * 0.2} fill={trunkColor} />
      <polygon
        points={`0,${-h} ${-w / 2},${-h * 0.55} ${-w / 4},${-h * 0.55} ${-w / 2},${-h * 0.2} ${w / 2},${-h * 0.2} ${w / 4},${-h * 0.55} ${w / 2},${-h * 0.55}`}
        fill={leafColor}
      />
      <polygon
        points={`0,${-h} ${-w / 4},${-h * 0.7} ${w / 4},${-h * 0.7}`}
        fill={leafLight}
        opacity="0.7"
      />
    </g>
  );
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
  const [endPoint, setEndPoint] = useState<Point>({ x: 200, y: 50 });

  useEffect(() => {
    if (!pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    setPathLen(len);
    const end = pathRef.current.getPointAtLength(len);
    setEndPoint({ x: end.x, y: end.y });
  }, []);

  const pointAt = (progress: number): Point => {
    const path = pathRef.current;
    if (!path || pathLen === 0) return { x: 60, y: 1560 };
    const p = path.getPointAtLength(clamp01(progress) * pathLen);
    return { x: p.x, y: p.y };
  };

  const milestonePoints = useMemo(
    () => MILESTONES.map((m) => pointAt(m.km / TOTAL_KM)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathLen]
  );

  // Sorted by km ascending so leader renders last → highest z-index
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
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-950 p-4">
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

      <p className="text-[11px] text-slate-400 text-center mb-2">
        Scrolla för att se hela rutten ↓
      </p>

      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Sky → forest → meadow gradient */}
            <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0b1437" />
              <stop offset="15%" stopColor="#1e1b4b" />
              <stop offset="35%" stopColor="#1e293b" />
              <stop offset="65%" stopColor="#0f2a1f" />
              <stop offset="90%" stopColor="#1a2e1a" />
              <stop offset="100%" stopColor="#3b2511" />
            </linearGradient>

            {/* Aurora shimmer */}
            <linearGradient id="aurora" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>

            {/* Mountain rock */}
            <linearGradient id="mountain" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="mountain-far" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Lake */}
            <radialGradient id="lake" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.95" />
            </radialGradient>

            {/* Hills */}
            <linearGradient id="hill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#14532d" />
              <stop offset="100%" stopColor="#052e16" />
            </linearGradient>

            {/* Road */}
            <linearGradient id="road-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fb923c" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.75" />
            </linearGradient>

            {/* Texture: subtle dots — terrain noise */}
            <pattern id="noise" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="#fff" opacity="0.04" />
              <circle cx="4" cy="3" r="0.4" fill="#fff" opacity="0.03" />
            </pattern>

            {/* Texture: grass tufts */}
            <pattern id="grass" width="14" height="10" patternUnits="userSpaceOnUse">
              <path d="M 2 10 L 3 6 M 6 10 L 7 5 M 10 10 L 11 7" stroke="#166534" strokeWidth="0.6" fill="none" opacity="0.5" />
            </pattern>
          </defs>

          {/* Background sky → ground */}
          <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#bg-gradient)" />
          <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#noise)" />

          {/* Aurora band */}
          <rect x="0" y="40" width={VIEWBOX_W} height="80" fill="url(#aurora)" opacity="0.6" />
          <rect x="0" y="100" width={VIEWBOX_W} height="60" fill="url(#aurora)" opacity="0.4" />

          {/* Stars */}
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f8fafc" opacity="0.85" />
          ))}

          {/* Moon */}
          <g transform="translate(330 70)">
            <circle r="18" fill="#fde68a" opacity="0.9" />
            <circle r="18" fill="#0b1437" transform="translate(6 -3)" />
            <circle cx="-6" cy="2" r="2" fill="#f59e0b" opacity="0.4" />
            <circle cx="-2" cy="-6" r="1.5" fill="#f59e0b" opacity="0.4" />
          </g>

          {/* Far mountains (back layer) */}
          <polygon
            points="0,420 70,260 130,340 210,200 290,320 370,250 400,330 400,520 0,520"
            fill="url(#mountain-far)"
            opacity="0.9"
          />
          {/* Snow caps far */}
          <polygon points="180,225 210,200 240,235 220,240 200,230" fill="#e2e8f0" opacity="0.85" />
          <polygon points="65,275 85,255 105,280 90,285" fill="#e2e8f0" opacity="0.7" />

          {/* Front mountains */}
          <polygon
            points="0,520 60,380 130,470 200,330 280,460 360,360 400,440 400,600 0,600"
            fill="url(#mountain)"
          />
          {/* Snow caps front */}
          <polygon points="180,355 200,330 230,370 210,375 195,365" fill="#f8fafc" opacity="0.95" />
          <polygon points="340,375 360,360 380,385 360,390" fill="#f8fafc" opacity="0.85" />
          <polygon points="50,400 60,380 80,410 65,415" fill="#f8fafc" opacity="0.85" />

          {/* Rolling hills */}
          {HILLS.map((h, i) => (
            <ellipse
              key={i}
              cx={h.cx}
              cy={h.cy}
              rx={h.rx}
              ry={h.ry}
              fill="url(#hill)"
              opacity="0.85"
            />
          ))}

          {/* Grass texture on bottom meadow */}
          <rect x="0" y="1380" width={VIEWBOX_W} height="220" fill="url(#grass)" />

          {/* Lake — placed in mid forest, off the road's path */}
          <g>
            <ellipse cx="200" cy="900" rx="95" ry="32" fill="url(#lake)" />
            <ellipse cx="200" cy="900" rx="95" ry="32" fill="none" stroke="#7dd3fc" strokeWidth="0.5" opacity="0.4" />
            {/* Lake shimmer */}
            <path d="M 150 895 Q 165 893, 180 895" stroke="#bae6fd" strokeWidth="0.8" fill="none" opacity="0.7" />
            <path d="M 215 905 Q 230 903, 245 905" stroke="#bae6fd" strokeWidth="0.8" fill="none" opacity="0.6" />
            <path d="M 175 910 Q 190 908, 205 910" stroke="#bae6fd" strokeWidth="0.8" fill="none" opacity="0.5" />
            {/* Tiny boat */}
            <g transform="translate(170 893)">
              <path d="M -5 1 L 5 1 L 4 3 L -4 3 Z" fill="#92400e" />
              <line x1="0" y1="1" x2="0" y2="-5" stroke="#fef3c7" strokeWidth="0.6" />
              <path d="M 0 -5 L 4 -2 L 0 -2 Z" fill="#fef3c7" />
            </g>
          </g>

          {/* Smaller pond near bottom */}
          <ellipse cx="80" cy="1480" rx="40" ry="14" fill="url(#lake)" opacity="0.85" />
          <path d="M 60 1478 Q 75 1476, 90 1478" stroke="#bae6fd" strokeWidth="0.6" fill="none" opacity="0.5" />

          {/* Cottage near start */}
          <g transform="translate(310 1500)">
            <rect x="-15" y="-12" width="30" height="20" fill="#7c2d12" />
            <polygon points="-18,-12 0,-26 18,-12" fill="#b91c1c" />
            <rect x="-4" y="-3" width="8" height="11" fill="#fbbf24" />
            <rect x="-12" y="-8" width="6" height="6" fill="#fde68a" opacity="0.8" />
            <rect x="6" y="-8" width="6" height="6" fill="#fde68a" opacity="0.8" />
            {/* Smoke from chimney */}
            <rect x="6" y="-22" width="3" height="6" fill="#475569" />
            <circle cx="7.5" cy="-28" r="2" fill="#94a3b8" opacity="0.5" />
            <circle cx="9" cy="-33" r="2.5" fill="#94a3b8" opacity="0.4" />
            <circle cx="7" cy="-39" r="3" fill="#94a3b8" opacity="0.3" />
          </g>

          {/* Campfire near a milestone (Surts Eldhult ~ middle) */}
          <g transform="translate(60 700)">
            <ellipse cx="0" cy="2" rx="8" ry="2" fill="#1c1917" opacity="0.8" />
            <line x1="-5" y1="2" x2="5" y2="-2" stroke="#78350f" strokeWidth="1.5" />
            <line x1="-4" y1="-2" x2="6" y2="2" stroke="#78350f" strokeWidth="1.5" />
            <path d="M 0 0 Q -3 -6, 0 -10 Q 3 -6, 0 0" fill="#fb923c" />
            <path d="M 0 -2 Q -2 -5, 0 -8 Q 2 -5, 0 -2" fill="#fde047" />
            {/* Glow */}
            <circle cx="0" cy="-4" r="14" fill="#fb923c" opacity="0.12" />
          </g>

          {/* Wooden bridge across the lake spot — spans the road */}
          <g transform="translate(280 800)">
            <rect x="-22" y="-3" width="44" height="6" fill="#78350f" opacity="0.9" />
            <line x1="-18" y1="-3" x2="-18" y2="3" stroke="#451a03" strokeWidth="1" />
            <line x1="-9" y1="-3" x2="-9" y2="3" stroke="#451a03" strokeWidth="1" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#451a03" strokeWidth="1" />
            <line x1="9" y1="-3" x2="9" y2="3" stroke="#451a03" strokeWidth="1" />
            <line x1="18" y1="-3" x2="18" y2="3" stroke="#451a03" strokeWidth="1" />
          </g>

          {/* Stone cairns along the trail */}
          <g transform="translate(370 1100)">
            <ellipse cx="0" cy="0" rx="6" ry="2" fill="#475569" />
            <ellipse cx="0" cy="-3" rx="4" ry="1.8" fill="#64748b" />
            <ellipse cx="0" cy="-5" rx="2" ry="1.2" fill="#94a3b8" />
          </g>
          <g transform="translate(30 350)">
            <ellipse cx="0" cy="0" rx="5" ry="1.8" fill="#475569" />
            <ellipse cx="0" cy="-2.5" rx="3" ry="1.5" fill="#64748b" />
          </g>

          {/* Wind turbine on a hill */}
          <g transform="translate(330 1200)">
            <line x1="0" y1="0" x2="0" y2="-30" stroke="#cbd5e1" strokeWidth="1.5" />
            <circle cx="0" cy="-30" r="1.5" fill="#cbd5e1" />
            <line x1="0" y1="-30" x2="10" y2="-36" stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1="0" y1="-30" x2="-10" y2="-36" stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1="0" y1="-30" x2="0" y2="-42" stroke="#e2e8f0" strokeWidth="1.5" />
          </g>

          {/* Trees */}
          {TREES.map((t, i) => (
            <PineTree key={i} x={t.x} y={t.y} h={t.h} dark={t.dark} />
          ))}

          {/* Road shadow */}
          <path
            d={ROAD_PATH}
            stroke="#000"
            strokeOpacity="0.45"
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
            stroke="#fde68a"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="6 10"
            opacity="0.85"
          />

          {/* Start marker */}
          <g transform="translate(60 1560)">
            <circle r="16" fill="#10b981" stroke="#064e3b" strokeWidth="2" />
            <text textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="700" fill="#fff">
              0
            </text>
            <text x="0" y="32" textAnchor="middle" fontSize="11" fontWeight="700" fill="#a7f3d0">
              START
            </text>
          </g>

          {/* Finish marker */}
          <g transform={`translate(${endPoint.x} ${endPoint.y})`}>
            <circle r="18" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
            <text textAnchor="middle" dominantBaseline="central" fontSize="16">
              🏁
            </text>
            <text x="0" y="-28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fde68a">
              MÅL · 1000 km
            </text>
          </g>

          {/* Milestones */}
          {milestonePoints.map((pt, i) => {
            const m = MILESTONES[i];
            const labelAbove = i % 2 === 0;
            return (
              <g key={m.km} transform={`translate(${pt.x} ${pt.y})`}>
                <circle r="12" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
                <text textAnchor="middle" dominantBaseline="central" fontSize="12">
                  {m.emoji}
                </text>
                <text
                  x="0"
                  y={labelAbove ? -20 : 26}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="#fde68a"
                  stroke="#0f172a"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {m.name}
                </text>
                <text
                  x="0"
                  y={labelAbove ? -9 : 37}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#94a3b8"
                  stroke="#0f172a"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {m.km} km
                </text>
              </g>
            );
          })}

          {/* Member icons (last → on top) */}
          {memberPositions.map(({ member, point, km }) => {
            const ringColor = member.icon_color || '#f97316';
            const isMe = member.id === currentUserId;
            const isLeader = leader?.member.id === member.id && km > 0;
            const initial = member.display_name.charAt(0).toUpperCase();
            const hasAvatar = !!member.avatar_url;
            const clipId = `clip-${member.id}`;
            return (
              <g key={member.id} transform={`translate(${point.x} ${point.y})`}>
                {isLeader && (
                  <circle r="22" fill="none" stroke="#fde047" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7">
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
                <circle r="17" fill={ringColor} />
                <circle r="14" fill="#0f172a" />
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
                    <text textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="700" fill="#f8fafc">
                      {initial}
                    </text>
                  </>
                )}
                <text
                  x="0"
                  y="32"
                  textAnchor="middle"
                  fontSize="11"
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
                  fontSize="10"
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
