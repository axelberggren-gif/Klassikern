'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bike, Flag } from 'lucide-react';
import type { Profile } from '@/types/database';

const TOTAL_KM = 1000;
const VIEWBOX_W = 400;
const VIEWBOX_H = 1700;

// Vertical winding "Irish country road" — from bottom (start) to top (finish).
const ROAD_PATH =
  'M 200 1640 ' +
  'C 90 1510, 320 1440, 210 1310 ' +
  'S 70 1110, 230 990 ' +
  'S 330 810, 170 690 ' +
  'S 60 510, 240 420 ' +
  'S 320 250, 180 180 ' +
  'S 90 70, 200 40';

// Milestones positioned by % of road length (start → finish).
const MILESTONES: { km: number; name: string; emoji: string; theme: 'wolf' | 'serpent' | 'fire' | 'storm' | 'tree' }[] = [
  { km: 150, name: 'Fenrirsbo',        emoji: '🐺', theme: 'wolf' },
  { km: 350, name: 'Jörmungandsvik',   emoji: '🌊', theme: 'serpent' },
  { km: 550, name: 'Surts Eldhult',    emoji: '☄️', theme: 'fire' },
  { km: 750, name: 'Ragnaröksköping',  emoji: '⚡', theme: 'storm' },
  { km: 950, name: 'Yggdrasilstorp',   emoji: '🌳', theme: 'tree' },
];

type Point = { x: number; y: number };
type Theme = (typeof MILESTONES)[number]['theme'];

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

// ---------------------------------------------------------------------------
// City illustrations — small SVG vignettes themed after the milestone name.
// Each is positioned in a <g transform="translate(...)"> so coordinates here
// are local (origin at the city anchor on the road).
// ---------------------------------------------------------------------------

function CityIllustration({ theme, side }: { theme: Theme; side: 'left' | 'right' }) {
  // Side determines which way the illustration extends from the road.
  const flip = side === 'left' ? -1 : 1;
  return (
    <g transform={`translate(${flip * 60} 0) scale(${flip} 1)`}>
      {theme === 'wolf' && <WolfDen />}
      {theme === 'serpent' && <SerpentBay />}
      {theme === 'fire' && <FireGrove />}
      {theme === 'storm' && <StormCastle />}
      {theme === 'tree' && <WorldTree />}
    </g>
  );
}

function WolfDen() {
  return (
    <g>
      {/* Pine trees behind */}
      <g fill="#0f3a26" stroke="#072018" strokeWidth="0.5">
        <polygon points="-50,-10 -42,-30 -34,-10" />
        <polygon points="-50,5 -42,-15 -34,5" />
        <polygon points="20,-5 28,-25 36,-5" />
      </g>
      {/* Cave mound */}
      <ellipse cx="-5" cy="15" rx="45" ry="22" fill="#3f3f46" />
      <ellipse cx="-5" cy="13" rx="40" ry="19" fill="#27272a" />
      {/* Cave mouth */}
      <path d="M -20 22 Q -5 -2, 10 22 Z" fill="#09090b" />
      {/* Glowing eyes inside cave */}
      <circle cx="-7" cy="14" r="1.4" fill="#fbbf24">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="0" cy="14" r="1.4" fill="#fbbf24">
        <animate attributeName="opacity" values="1;0.4;1" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* Wolf on top */}
      <g transform="translate(15 -8)">
        <ellipse cx="0" cy="0" rx="9" ry="4" fill="#1f2937" />
        <polygon points="-9,0 -13,-4 -10,2" fill="#1f2937" />
        <polygon points="-13,-4 -14,-7 -11,-5" fill="#1f2937" />
        <polygon points="-13,-7 -10,-7 -11,-5" fill="#1f2937" />
        <circle cx="-11" cy="-3" r="0.8" fill="#fbbf24" />
        <line x1="6" y1="0" x2="11" y2="-3" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* Paw prints */}
      <g fill="#52525b" opacity="0.7">
        <ellipse cx="-30" cy="38" rx="1.6" ry="2" />
        <ellipse cx="-22" cy="42" rx="1.6" ry="2" />
        <ellipse cx="-30" cy="46" rx="1.6" ry="2" />
        <ellipse cx="-22" cy="50" rx="1.6" ry="2" />
      </g>
    </g>
  );
}

function SerpentBay() {
  return (
    <g>
      {/* Water */}
      <ellipse cx="0" cy="20" rx="55" ry="22" fill="#1e3a8a" />
      <ellipse cx="0" cy="20" rx="50" ry="18" fill="#2563eb" />
      {/* Wave dashes */}
      <g stroke="#bfdbfe" strokeWidth="1" fill="none" opacity="0.7">
        <path d="M -40 18 q 4 -2 8 0 t 8 0" />
        <path d="M -10 28 q 4 -2 8 0 t 8 0" />
        <path d="M 20 22 q 4 -2 8 0 t 8 0" />
      </g>
      {/* Sea serpent humps */}
      <g fill="#10b981" stroke="#064e3b" strokeWidth="1">
        <path d="M -45 20 q 7 -10 14 0" />
        <path d="M -25 18 q 7 -12 14 0" />
        <path d="M -5 19 q 7 -14 14 0" />
        <path d="M 15 18 q 6 -10 12 0" />
      </g>
      {/* Serpent head */}
      <g transform="translate(35 8)">
        <ellipse cx="0" cy="0" rx="8" ry="5" fill="#10b981" stroke="#064e3b" strokeWidth="1" />
        <circle cx="3" cy="-1" r="1.2" fill="#fde047" />
        <circle cx="3" cy="-1" r="0.6" fill="#000" />
        <path d="M 7 1 q 4 0 6 -2 M 7 2 q 4 1 6 0" stroke="#dc2626" strokeWidth="1" fill="none" />
      </g>
      {/* Boat */}
      <g transform="translate(-30 14)">
        <path d="M -10 0 L 10 0 L 7 4 L -7 4 Z" fill="#92400e" stroke="#451a03" strokeWidth="0.7" />
        <line x1="0" y1="0" x2="0" y2="-10" stroke="#451a03" strokeWidth="1" />
        <polygon points="0,-10 0,-2 7,-3" fill="#fef3c7" stroke="#a16207" strokeWidth="0.5" />
      </g>
      {/* Lighthouse */}
      <g transform="translate(40 -8)">
        <rect x="-4" y="0" width="8" height="14" fill="#fef3c7" stroke="#7c2d12" strokeWidth="0.5" />
        <rect x="-4" y="4" width="8" height="2" fill="#dc2626" />
        <polygon points="-5,0 5,0 0,-6" fill="#7c2d12" />
        <circle cx="0" cy="-2" r="2" fill="#fbbf24">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
    </g>
  );
}

function FireGrove() {
  return (
    <g>
      {/* Volcanic mound */}
      <path d="M -55 30 L -10 -25 L 10 -25 L 55 30 Z" fill="#1f1f23" />
      <path d="M -50 30 L -8 -20 L 8 -20 L 50 30 Z" fill="#3f3f46" />
      {/* Lava cracks */}
      <g stroke="#f97316" strokeWidth="1.5" fill="none">
        <path d="M -20 30 L -15 10 L -22 -5">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
        </path>
        <path d="M 5 30 L 10 8 L 4 -10">
          <animate attributeName="opacity" values="1;0.5;1" dur="2.2s" repeatCount="indefinite" />
        </path>
        <path d="M 25 30 L 22 12">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
        </path>
      </g>
      {/* Crater glow */}
      <ellipse cx="0" cy="-22" rx="10" ry="3" fill="#f97316">
        <animate attributeName="ry" values="2;4;2" dur="1.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="0" cy="-22" rx="6" ry="1.5" fill="#fde047" />
      {/* Smoke plume */}
      <g fill="#52525b" opacity="0.55">
        <circle cx="0" cy="-30" r="6">
          <animate attributeName="cy" values="-30;-50;-30" dur="6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle cx="-4" cy="-38" r="5">
          <animate attributeName="cy" values="-38;-58;-38" dur="6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle cx="6" cy="-44" r="4">
          <animate attributeName="cy" values="-44;-64;-44" dur="6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="6s" repeatCount="indefinite" />
        </circle>
      </g>
      {/* Charred trees */}
      <g fill="#0a0a0a" stroke="#27272a" strokeWidth="0.5">
        <path d="M -45 32 L -45 18 M -47 22 L -45 26 L -42 21 M -45 18 L -48 14" stroke="#0a0a0a" strokeWidth="1.2" fill="none" />
        <circle cx="-48" cy="14" r="1" fill="#f97316">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
        <path d="M 42 32 L 42 16 M 40 22 L 42 24 L 45 19 M 42 16 L 39 12" stroke="#0a0a0a" strokeWidth="1.2" fill="none" />
        <circle cx="39" cy="12" r="0.8" fill="#fbbf24">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.7s" repeatCount="indefinite" />
        </circle>
      </g>
    </g>
  );
}

function StormCastle() {
  return (
    <g>
      {/* Rocky base */}
      <path d="M -55 35 L -45 18 L 45 18 L 55 35 Z" fill="#1f2937" />
      {/* Castle wall */}
      <rect x="-40" y="-10" width="80" height="28" fill="#475569" stroke="#1e293b" strokeWidth="1" />
      {/* Crenellations */}
      <g fill="#475569" stroke="#1e293b" strokeWidth="1">
        <rect x="-40" y="-15" width="6" height="6" />
        <rect x="-26" y="-15" width="6" height="6" />
        <rect x="-12" y="-15" width="6" height="6" />
        <rect x="2" y="-15" width="6" height="6" />
        <rect x="16" y="-15" width="6" height="6" />
        <rect x="30" y="-15" width="6" height="6" />
      </g>
      {/* Towers */}
      <rect x="-48" y="-22" width="14" height="40" fill="#334155" stroke="#1e293b" strokeWidth="1" />
      <rect x="34" y="-22" width="14" height="40" fill="#334155" stroke="#1e293b" strokeWidth="1" />
      <polygon points="-48,-22 -34,-22 -41,-32" fill="#7f1d1d" stroke="#1e293b" strokeWidth="0.7" />
      <polygon points="34,-22 48,-22 41,-32" fill="#7f1d1d" stroke="#1e293b" strokeWidth="0.7" />
      {/* Center keep */}
      <rect x="-10" y="-30" width="20" height="20" fill="#334155" stroke="#1e293b" strokeWidth="1" />
      <polygon points="-10,-30 10,-30 0,-44" fill="#7f1d1d" stroke="#1e293b" strokeWidth="0.7" />
      {/* Flag */}
      <line x1="0" y1="-44" x2="0" y2="-54" stroke="#1e293b" strokeWidth="1" />
      <polygon points="0,-54 0,-48 7,-51" fill="#dc2626" />
      {/* Gate */}
      <path d="M -6 18 L -6 6 Q 0 0, 6 6 L 6 18 Z" fill="#0f172a" />
      {/* Storm cloud */}
      <g fill="#1e293b">
        <ellipse cx="-20" cy="-55" rx="20" ry="7" />
        <ellipse cx="0" cy="-58" rx="25" ry="9" />
        <ellipse cx="22" cy="-54" rx="18" ry="7" />
      </g>
      {/* Lightning bolt */}
      <polygon points="-4,-50 6,-38 -1,-38 4,-25 -8,-40 0,-40" fill="#fde047" stroke="#fbbf24" strokeWidth="0.5">
        <animate attributeName="opacity" values="0;0;1;0;0;0;0;0;1;0" dur="4s" repeatCount="indefinite" />
      </polygon>
      {/* Ravens */}
      <g fill="#000">
        <path d="M -35 -38 q 3 -2 6 0 q -3 0 -3 2 q 0 -2 -3 -2" />
        <path d="M 25 -42 q 3 -2 6 0 q -3 0 -3 2 q 0 -2 -3 -2" />
        <path d="M 40 -34 q 2 -1.5 4 0 q -2 0 -2 1.5 q 0 -1.5 -2 -1.5" />
      </g>
    </g>
  );
}

function WorldTree() {
  return (
    <g>
      {/* Glowing aura */}
      <circle cx="0" cy="-35" r="55" fill="url(#tree-glow)" opacity="0.5" />
      {/* Roots spreading */}
      <g stroke="#78350f" strokeWidth="2" fill="none">
        <path d="M -8 30 q -10 0 -15 8" />
        <path d="M -4 32 q -6 4 -8 12" />
        <path d="M 4 32 q 6 4 8 12" />
        <path d="M 8 30 q 10 0 15 8" />
      </g>
      {/* Trunk */}
      <path d="M -10 30 L -8 -10 L 8 -10 L 10 30 Z" fill="#92400e" stroke="#451a03" strokeWidth="1" />
      <path d="M -6 25 L -4 -5 M 5 20 L 3 0" stroke="#451a03" strokeWidth="0.5" fill="none" />
      {/* Canopy layers */}
      <g stroke="#14532d" strokeWidth="0.7">
        <ellipse cx="0" cy="-25" rx="42" ry="22" fill="#15803d" />
        <ellipse cx="-15" cy="-35" rx="22" ry="14" fill="#16a34a" />
        <ellipse cx="18" cy="-35" rx="22" ry="14" fill="#16a34a" />
        <ellipse cx="0" cy="-50" rx="25" ry="14" fill="#22c55e" />
      </g>
      {/* Golden leaves / fruit */}
      <g fill="#fbbf24">
        <circle cx="-20" cy="-22" r="2">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="15" cy="-30" r="2">
          <animate attributeName="opacity" values="1;0.6;1" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="-5" cy="-48" r="1.8">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="22" cy="-22" r="1.5" />
        <circle cx="-28" cy="-32" r="1.5" />
        <circle cx="8" cy="-18" r="1.5" />
      </g>
      {/* Cottage at base */}
      <g transform="translate(-32 22)">
        <rect x="-8" y="-6" width="16" height="10" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.7" />
        <polygon points="-10,-6 10,-6 0,-14" fill="#92400e" stroke="#451a03" strokeWidth="0.7" />
        <rect x="-2" y="-2" width="4" height="6" fill="#451a03" />
        <rect x="-7" y="-4" width="3" height="3" fill="#fef3c7" />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Background decorations — pine clusters, hills, lakes, sheep, fences, clouds.
// Coordinates absolute in the 400×1700 viewBox.
// ---------------------------------------------------------------------------

function Pine({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <polygon points="-6,4 0,-10 6,4" fill="#15803d" />
      <polygon points="-7,8 0,-4 7,8" fill="#166534" />
      <rect x="-1.2" y="6" width="2.4" height="4" fill="#451a03" />
    </g>
  );
}

function Sheep({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="3.5" ry="2.2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.4" />
      <circle cx="3" cy="-1" r="1.4" fill="#1e293b" />
      <line x1="-2" y1="2" x2="-2" y2="3.5" stroke="#1e293b" strokeWidth="0.5" />
      <line x1="1.5" y1="2" x2="1.5" y2="3.5" stroke="#1e293b" strokeWidth="0.5" />
    </g>
  );
}

function Stone({ x, y, r = 3 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx={r} ry={r * 0.7} fill="#a8a29e" stroke="#57534e" strokeWidth="0.4" />
      <ellipse cx={-r * 0.3} cy={-r * 0.3} rx={r * 0.3} ry={r * 0.2} fill="#d6d3d1" />
    </g>
  );
}

function Cloud({ x, y, scale = 1, dur = 60 }: { x: number; y: number; scale?: number; dur?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.85">
      <g fill="#f1f5f9">
        <circle cx="0" cy="0" r="6" />
        <circle cx="7" cy="-2" r="7" />
        <circle cx="14" cy="0" r="5" />
        <circle cx="4" cy="3" r="5" />
      </g>
      <animateTransform
        attributeName="transform"
        type="translate"
        from={`${x} ${y}`}
        to={`${x + 30} ${y}`}
        dur={`${dur}s`}
        repeatCount="indefinite"
        additive="sum"
      />
    </g>
  );
}

function Hill({ x, y, w = 60, h = 25, color = '#365314' }: { x: number; y: number; w?: number; h?: number; color?: string }) {
  return (
    <ellipse cx={x} cy={y} rx={w} ry={h} fill={color} />
  );
}

function FenceSegment({ x, y, w = 30 }: { x: number; y: number; w?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke="#78350f" strokeWidth="0.8" fill="none">
      <line x1="0" y1="0" x2={w} y2="0" />
      <line x1="0" y1="3" x2={w} y2="3" />
      <line x1="0" y1="-2" x2="0" y2="5" />
      <line x1={w / 3} y1="-2" x2={w / 3} y2="5" />
      <line x1={(2 * w) / 3} y1="-2" x2={(2 * w) / 3} y2="5" />
      <line x1={w} y1="-2" x2={w} y2="5" />
    </g>
  );
}

function Bird({ x, y }: { x: number; y: number }) {
  return (
    <path d={`M ${x} ${y} q 3 -2 6 0 q -3 0 -3 2 q 0 -2 -3 -2`} fill="#0f172a" />
  );
}

function Lake({ x, y, w = 30, h = 12 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx={w} ry={h} fill="#1e3a8a" />
      <ellipse cx="0" cy="-1" rx={w - 4} ry={h - 2} fill="#3b82f6" />
      <path d={`M ${-w * 0.4} -1 q 4 -2 8 0`} stroke="#bfdbfe" strokeWidth="0.6" fill="none" opacity="0.7" />
      <path d={`M ${w * 0.1} 1 q 4 -2 8 0`} stroke="#bfdbfe" strokeWidth="0.6" fill="none" opacity="0.7" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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

  useEffect(() => {
    if (!pathRef.current) return;
    setPathLen(pathRef.current.getTotalLength());
  }, []);

  const pointAt = (progress: number): Point => {
    const path = pathRef.current;
    if (!path || pathLen === 0) return { x: 200, y: 1640 };
    const p = path.getPointAtLength(clamp01(progress) * pathLen);
    return { x: p.x, y: p.y };
  };

  const milestonePoints = useMemo(
    () => MILESTONES.map((m) => pointAt(m.km / TOTAL_KM)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathLen]
  );

  const memberPositions = useMemo(() => {
    const list = members.map((m) => {
      const km = Math.max(0, distances.get(m.id) ?? 0);
      return { member: m, km, progress: clamp01(km / TOTAL_KM) };
    });
    list.sort((a, b) => a.km - b.km);
    return list.map((entry) => ({ ...entry, point: pointAt(entry.progress) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, distances, pathLen]);

  const leader = memberPositions.length > 0 ? memberPositions[memberPositions.length - 1] : null;
  const currentUserKm = distances.get(currentUserId) ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-900 via-emerald-950/40 to-amber-950/30 p-3">
      <div className="flex items-center justify-between mb-3 px-1">
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

      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Sky-to-grass background gradient (top is mystical sky, bottom is meadow) */}
          <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="8%" stopColor="#312e81" />
            <stop offset="22%" stopColor="#1e293b" />
            <stop offset="40%" stopColor="#1f2937" />
            <stop offset="60%" stopColor="#14532d" />
            <stop offset="80%" stopColor="#166534" />
            <stop offset="100%" stopColor="#365314" />
          </linearGradient>

          {/* Grass texture pattern */}
          <pattern id="grass-texture" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="transparent" />
            <line x1="2" y1="18" x2="2" y2="14" stroke="#14532d" strokeWidth="0.5" opacity="0.6" />
            <line x1="6" y1="20" x2="6" y2="15" stroke="#166534" strokeWidth="0.5" opacity="0.6" />
            <line x1="10" y1="18" x2="10" y2="13" stroke="#15803d" strokeWidth="0.5" opacity="0.5" />
            <line x1="14" y1="20" x2="14" y2="14" stroke="#14532d" strokeWidth="0.5" opacity="0.6" />
            <line x1="18" y1="19" x2="18" y2="14" stroke="#166534" strokeWidth="0.5" opacity="0.5" />
          </pattern>

          {/* Road gradient & dashed center line pattern */}
          <linearGradient id="road-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.85" />
          </linearGradient>

          {/* World tree glow */}
          <radialGradient id="tree-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
          </radialGradient>

          {/* Star (for the night sky region near finish) */}
          <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ============================================================== */}
        {/* Background sky/grass gradient + grass texture overlay */}
        {/* ============================================================== */}
        <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#bg-gradient)" />
        <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#grass-texture)" />

        {/* Stars near the top (Ragnarök sky) */}
        <g fill="#fff">
          <circle cx="50" cy="80" r="0.8" opacity="0.7" />
          <circle cx="120" cy="40" r="1.2" opacity="0.9" />
          <circle cx="210" cy="100" r="0.6" opacity="0.6" />
          <circle cx="280" cy="60" r="1" opacity="0.8" />
          <circle cx="350" cy="120" r="0.7" opacity="0.7" />
          <circle cx="80" cy="160" r="0.6" opacity="0.5" />
          <circle cx="320" cy="200" r="0.8" opacity="0.6" />
          <circle cx="60" cy="240" r="0.5" opacity="0.4" />
        </g>

        {/* Distant mountain silhouettes near the top */}
        <g fill="#0f172a" opacity="0.85">
          <polygon points="0,300 60,240 110,290 170,220 230,280 290,230 350,290 400,260 400,340 0,340" />
        </g>
        <g fill="#1e293b" opacity="0.75">
          <polygon points="0,360 70,310 140,350 200,290 270,340 340,300 400,350 400,400 0,400" />
        </g>

        {/* Drifting clouds */}
        <Cloud x={50} y={140} scale={0.9} dur={80} />
        <Cloud x={250} y={80} scale={1.1} dur={120} />
        <Cloud x={150} y={260} scale={0.8} dur={100} />
        <Cloud x={310} y={420} scale={0.7} dur={90} />

        {/* Birds in the sky */}
        <Bird x={100} y={200} />
        <Bird x={108} y={203} />
        <Bird x={300} y={300} />

        {/* Hills scattered in the middle/bottom */}
        <Hill x={50} y={1480} w={70} h={28} color="#365314" />
        <Hill x={350} y={1450} w={60} h={24} color="#3f6212" />
        <Hill x={90} y={1180} w={55} h={22} color="#365314" />
        <Hill x={320} y={920} w={65} h={26} color="#3f6212" />
        <Hill x={70} y={650} w={50} h={20} color="#3f6212" />
        <Hill x={350} y={580} w={55} h={22} color="#365314" />

        {/* Lakes tucked between curves */}
        <Lake x={80} y={1380} w={32} h={11} />
        <Lake x={330} y={830} w={28} h={10} />

        {/* Pine clusters scattered along the route */}
        <Pine x={40} y={1620} scale={1.2} />
        <Pine x={50} y={1595} scale={0.9} />
        <Pine x={365} y={1610} scale={1.1} />
        <Pine x={375} y={1585} scale={0.9} />

        <Pine x={350} y={1500} scale={1.0} />
        <Pine x={30} y={1430} scale={1.1} />
        <Pine x={40} y={1395} scale={0.8} />

        <Pine x={350} y={1230} scale={1.0} />
        <Pine x={365} y={1200} scale={0.9} />
        <Pine x={45} y={1130} scale={1.0} />

        <Pine x={40} y={970} scale={1.0} />
        <Pine x={365} y={930} scale={1.1} />
        <Pine x={355} y={900} scale={0.9} />

        <Pine x={40} y={730} scale={0.9} />
        <Pine x={50} y={700} scale={1.1} />
        <Pine x={355} y={680} scale={1.0} />

        <Pine x={365} y={520} scale={0.9} />
        <Pine x={50} y={460} scale={1.0} />

        {/* Sheep flocks */}
        <Sheep x={80} y={1565} />
        <Sheep x={88} y={1568} />
        <Sheep x={84} y={1572} />

        <Sheep x={340} y={1320} />
        <Sheep x={348} y={1325} />

        <Sheep x={70} y={1050} />
        <Sheep x={78} y={1054} />
        <Sheep x={74} y={1058} />

        <Sheep x={335} y={760} />

        {/* Stones along the road */}
        <Stone x={140} y={1580} r={3} />
        <Stone x={260} y={1530} r={2.5} />
        <Stone x={170} y={1340} r={3} />
        <Stone x={250} y={1220} r={2.5} />
        <Stone x={150} y={1080} r={3} />
        <Stone x={260} y={870} r={2.5} />
        <Stone x={155} y={690} r={3} />
        <Stone x={245} y={510} r={2.5} />
        <Stone x={170} y={310} r={3} />

        {/* Rustic fences */}
        <FenceSegment x={75} y={1540} w={28} />
        <FenceSegment x={290} y={1370} w={28} />
        <FenceSegment x={75} y={1100} w={28} />
        <FenceSegment x={290} y={820} w={28} />
        <FenceSegment x={75} y={580} w={28} />

        {/* ============================================================== */}
        {/* Road (rendered after background, before milestones/members) */}
        {/* ============================================================== */}
        {/* Road shadow */}
        <path
          d={ROAD_PATH}
          stroke="#000"
          strokeOpacity="0.4"
          strokeWidth="20"
          fill="none"
          strokeLinecap="round"
          transform="translate(2 4)"
        />
        {/* Road base */}
        <path
          ref={pathRef}
          d={ROAD_PATH}
          stroke="url(#road-gradient)"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />
        {/* Road border */}
        <path
          d={ROAD_PATH}
          stroke="#fef3c7"
          strokeOpacity="0.4"
          strokeWidth="19"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={ROAD_PATH}
          stroke="url(#road-gradient)"
          strokeWidth="17"
          fill="none"
          strokeLinecap="round"
        />
        {/* Center dashed line */}
        <path
          d={ROAD_PATH}
          stroke="#fef3c7"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="6 8"
          opacity="0.85"
        />

        {/* ============================================================== */}
        {/* Start marker (bottom) */}
        {/* ============================================================== */}
        <g transform="translate(200 1640)">
          {/* Banner pole */}
          <line x1="-20" y1="-25" x2="-20" y2="20" stroke="#451a03" strokeWidth="2" />
          <line x1="20" y1="-25" x2="20" y2="20" stroke="#451a03" strokeWidth="2" />
          {/* Banner */}
          <rect x="-22" y="-30" width="44" height="14" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" />
          <text textAnchor="middle" x="0" y="-20" fontSize="9" fontWeight="700" fill="#fef3c7">START</text>
          {/* Marker */}
          <circle r="14" fill="#10b981" stroke="#064e3b" strokeWidth="2" />
          <text textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700" fill="#fff">0 km</text>
        </g>

        {/* ============================================================== */}
        {/* Finish marker (top) */}
        {/* ============================================================== */}
        <g transform="translate(200 40)">
          <rect x="-30" y="-22" width="60" height="14" fill="#fbbf24" stroke="#78350f" strokeWidth="1.2" />
          <text textAnchor="middle" x="0" y="-12" fontSize="9" fontWeight="700" fill="#451a03">MÅL · 1000 km</text>
          {/* Checkered pattern */}
          <g>
            {Array.from({ length: 6 }).map((_, i) => (
              <rect
                key={i}
                x={-30 + i * 10}
                y={-7}
                width="10"
                height="6"
                fill={i % 2 === 0 ? '#0f172a' : '#fef3c7'}
              />
            ))}
          </g>
          <circle r="16" cy="8" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
          <text textAnchor="middle" dominantBaseline="central" y="8" fontSize="14">🏁</text>
        </g>

        {/* ============================================================== */}
        {/* Milestone cities (illustration + marker + label) */}
        {/* ============================================================== */}
        {milestonePoints.map((pt, i) => {
          const m = MILESTONES[i];
          // Alternate sides so cities don't crowd each other
          const side: 'left' | 'right' = i % 2 === 0 ? 'right' : 'left';
          const labelY = 38;
          return (
            <g key={m.km} transform={`translate(${pt.x} ${pt.y})`}>
              {/* City illustration off to one side */}
              <CityIllustration theme={m.theme} side={side} />

              {/* Milestone post on the road */}
              <g>
                <line x1="0" y1="0" x2="0" y2="-22" stroke="#451a03" strokeWidth="1.5" />
                <rect x="-18" y="-32" width="36" height="12" fill="#fbbf24" stroke="#78350f" strokeWidth="1" rx="1.5" />
                <text textAnchor="middle" x="0" y="-23" fontSize="7" fontWeight="700" fill="#451a03">
                  {m.km} km
                </text>
                <circle r="9" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
                <text textAnchor="middle" dominantBaseline="central" fontSize="9">{m.emoji}</text>
              </g>

              {/* Label */}
              <text
                x="0"
                y={labelY}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#fde68a"
                stroke="#0f172a"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {m.name}
              </text>
            </g>
          );
        })}

        {/* ============================================================== */}
        {/* Member icons (rendered last so they're on top) */}
        {/* ============================================================== */}
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
                <circle r="30" fill="none" stroke="#fde047" strokeWidth="2" strokeDasharray="3 3" opacity="0.7">
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
              {/* Outer colored ring */}
              <circle r="22" fill={ringColor} />
              {/* Inner spacer */}
              <circle r="19" fill="#0f172a" />
              {hasAvatar ? (
                <>
                  <defs>
                    <clipPath id={clipId}>
                      <circle r="18" />
                    </clipPath>
                  </defs>
                  <image
                    href={member.avatar_url ?? undefined}
                    x="-18"
                    y="-18"
                    width="36"
                    height="36"
                    clipPath={`url(#${clipId})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </>
              ) : (
                <>
                  <circle r="18" fill="#1e293b" />
                  <text textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="700" fill="#f8fafc">
                    {initial}
                  </text>
                </>
              )}
              {/* Name label */}
              <text
                x="0"
                y="42"
                textAnchor="middle"
                fontSize="12"
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
                y="56"
                textAnchor="middle"
                fontSize="11"
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
