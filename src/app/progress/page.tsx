'use client';

import { useState, useEffect } from 'react';
import { Timer, Trophy, Target } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth';
import { getUserStats } from '@/lib/store';

interface RaceCardProps {
  icon: string;
  name: string;
  sport: string;
  distance: string;
  targetTime: string;
  date: string;
  statLabel: string;
  statValue: string;
  sessionsCount: number;
  totalMinutes: number;
  progressPercent: number;
  color: string;
  bgColor: string;
}

function RaceCard({ icon, name, sport, distance, targetTime, date, statLabel, statValue, sessionsCount, totalMinutes, progressPercent, color, bgColor }: RaceCardProps) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return (
    <div className={`rounded-2xl border ${bgColor} p-5 shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-bold text-gray-800">{name}</h3>
            <p className="text-xs text-gray-500">{distance} · Mål: {targetTime} · {date}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color }}>{sessionsCount}</p>
          <p className="text-[10px] text-gray-500">Pass</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color }}>
            {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
          </p>
          <p className="text-[10px] text-gray-500">Träningstid</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color }}>{statValue}</p>
          <p className="text-[10px] text-gray-500">{statLabel}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Träningsframsteg</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/60">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(progressPercent, 100)}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

function DaysUntil({ date, label }: { date: string; label: string }) {
  const target = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return null;

  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-800">{diffDays}</p>
      <p className="text-[10px] text-gray-500">dagar till {label}</p>
    </div>
  );
}

type StatsResult = Awaited<ReturnType<typeof getUserStats>>;

export default function ProgressPage() {
  const { user, profile, loading } = useAuth();
  const [stats, setStats] = useState<StatsResult | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserStats(user.id).then(setStats);
  }, [user]);

  useEffect(() => {
    if (!loading && !profile) {
      window.location.href = '/login';
    }
  }, [loading, profile]);

  if (loading || !profile || !stats) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-orange-500 border-t-transparent" />
          <p className="text-sm text-gray-400">Laddar...</p>
        </div>
      </div>
    );
  return (
    <AppShell>
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Framsteg</h1>
        <p className="text-sm text-gray-500 mt-1">Din resa mot En Svensk Klassiker</p>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Vasaloppet — completed! */}
        <div className="rounded-2xl bg-green-50 border border-green-200 p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎿</span>
            <div className="flex-1">
              <h3 className="font-bold text-green-700">Vasaloppet</h3>
              <p className="text-xs text-green-600">90 km · Avklarat! ✅</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
              <Trophy size={18} className="text-white" />
            </div>
          </div>
        </div>

        {/* Countdown chips */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
            <DaysUntil date="2026-06-12" label="VR" />
          </div>
          <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-3">
            <DaysUntil date="2026-07-04" label="Vansbro" />
          </div>
          <div className="rounded-xl bg-green-50 border border-green-100 p-3">
            <DaysUntil date="2026-09-26" label="Lidingö" />
          </div>
        </div>

        {/* Vätternrundan */}
        <RaceCard
          icon="🚴"
          name="Vätternrundan"
          sport="Cykling"
          distance="315 km"
          targetTime="9h"
          date="Juni 2026"
          statLabel="Total km"
          statValue={stats.cycling.totalKm > 0 ? `${stats.cycling.totalKm.toFixed(0)} km` : '—'}
          sessionsCount={stats.cycling.sessions}
          totalMinutes={stats.cycling.totalMinutes}
          progressPercent={(stats.cycling.totalMinutes / (9 * 60)) * 100}
          color="#3B82F6"
          bgColor="bg-blue-50/50 border-blue-200"
        />

        {/* Vansbrosimningen */}
        <RaceCard
          icon="🏊"
          name="Vansbrosimningen"
          sport="Simning"
          distance="3 km"
          targetTime="1h"
          date="Juli 2026"
          statLabel="Pass"
          statValue={`${stats.swimming.sessions}`}
          sessionsCount={stats.swimming.sessions}
          totalMinutes={stats.swimming.totalMinutes}
          progressPercent={(stats.swimming.totalMinutes / 60) * 100}
          color="#06B6D4"
          bgColor="bg-cyan-50/50 border-cyan-200"
        />

        {/* Lidingöloppet */}
        <RaceCard
          icon="🏃"
          name="Lidingöloppet"
          sport="Löpning"
          distance="30 km"
          targetTime="3h"
          date="September 2026"
          statLabel="Total km"
          statValue={stats.running.totalKm > 0 ? `${stats.running.totalKm.toFixed(0)} km` : '—'}
          sessionsCount={stats.running.sessions}
          totalMinutes={stats.running.totalMinutes}
          progressPercent={(stats.running.totalMinutes / (3 * 60)) * 100}
          color="#22C55E"
          bgColor="bg-green-50/50 border-green-200"
        />

        {/* Overall stats */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Totalt</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                <Target size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">{stats.totalSessions}</p>
                <p className="text-xs text-gray-500">Pass totalt</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Timer size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">
                  {Math.floor(stats.totalDurationMinutes / 60)}h {stats.totalDurationMinutes % 60}m
                </p>
                <p className="text-xs text-gray-500">Träningstid</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
