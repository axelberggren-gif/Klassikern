'use client';

import { Bike, Waves, PersonStanding, Mountain } from 'lucide-react';
import type { Profile, Session } from '@/types/database';
import type { SportType } from '@/types/database';

interface RaceInfo {
  key: 'vr' | 'vansbro' | 'lidingo' | 'vasaloppet';
  name: string;
  sport: SportType;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  dateField: keyof Profile;
  color: string;
  bgColor: string;
  borderColor: string;
}

const RACES: RaceInfo[] = [
  {
    key: 'vr',
    name: 'Vätternrundan',
    sport: 'cycling',
    icon: Bike,
    dateField: 'race_date_vr',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/15',
    borderColor: 'border-sky-500/30',
  },
  {
    key: 'vansbro',
    name: 'Vansbrosimningen',
    sport: 'swimming',
    icon: Waves,
    dateField: 'race_date_vansbro',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/15',
    borderColor: 'border-cyan-500/30',
  },
  {
    key: 'lidingo',
    name: 'Lidingöloppet',
    sport: 'running',
    icon: PersonStanding,
    dateField: 'race_date_lidingo',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
  },
  {
    key: 'vasaloppet',
    name: 'Vasaloppet',
    sport: 'other', // skiing not a sport type, use 'other'
    icon: Mountain,
    dateField: 'race_date_vasaloppet',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/15',
    borderColor: 'border-violet-500/30',
  },
];

function getDaysRemaining(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const race = new Date(dateStr + 'T00:00:00');
  return Math.ceil((race.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getReadiness(
  sport: SportType,
  sessions: Session[],
  plannedMinutes: number
): number {
  const loggedMinutes = sessions
    .filter((s) => s.sport_type === sport || (sport === 'other' && s.sport_type !== 'rest'))
    .reduce((sum, s) => sum + s.duration_minutes, 0);

  if (plannedMinutes === 0) return 100;
  return Math.min(100, Math.round((loggedMinutes / plannedMinutes) * 100));
}

function getPlannedMinutesForSport(
  sport: SportType,
  plan: { date: string; sport_type: SportType; suggested_duration_minutes: number | null }[]
): number {
  const today = new Date().toISOString().split('T')[0];
  return plan
    .filter((p) => {
      const match = sport === 'other'
        ? p.sport_type !== 'rest'
        : p.sport_type === sport;
      return match && p.date <= today;
    })
    .reduce((sum, p) => sum + (p.suggested_duration_minutes || 0), 0);
}

function getStatusColor(readiness: number): { bar: string; label: string; text: string } {
  if (readiness >= 80) return { bar: 'bg-emerald-500', label: 'På spåret', text: 'text-emerald-400' };
  if (readiness >= 50) return { bar: 'bg-amber-500', label: 'Lite efter', text: 'text-amber-400' };
  return { bar: 'bg-rose-500', label: 'Behöver köra på', text: 'text-rose-400' };
}

interface RaceCountdownProps {
  profile: Profile;
  sessions: Session[];
  plan: { date: string; sport_type: SportType; suggested_duration_minutes: number | null }[];
}

export default function RaceCountdown({ profile, sessions, plan }: RaceCountdownProps) {
  const activeRaces = RACES.filter((race) => {
    const dateVal = profile[race.dateField] as string | null;
    if (!dateVal) return false;
    return getDaysRemaining(dateVal) > 0;
  });

  if (activeRaces.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
        Tävlingsnedräkning
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {activeRaces.map((race) => {
          const dateStr = profile[race.dateField] as string;
          const days = getDaysRemaining(dateStr);
          const Icon = race.icon;
          const plannedMin = getPlannedMinutesForSport(race.sport, plan);
          const readiness = getReadiness(race.sport, sessions, plannedMin);
          const status = getStatusColor(readiness);
          const raceDate = new Date(dateStr + 'T00:00:00');
          const dateLabel = raceDate.toLocaleDateString('sv-SE', {
            day: 'numeric',
            month: 'short',
          });

          return (
            <div
              key={race.key}
              className={`rounded-2xl bg-slate-900 border ${race.borderColor} p-4 flex flex-col gap-3`}
            >
              {/* Header */}
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${race.bgColor}`}>
                  <Icon size={16} className={race.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {race.name}
                  </p>
                  <p className="text-[10px] text-slate-400">{dateLabel}</p>
                </div>
              </div>

              {/* Days remaining */}
              <div className="text-center">
                <p className={`text-2xl font-bold ${race.color}`}>{days}</p>
                <p className="text-[10px] text-slate-400">dagar kvar</p>
              </div>

              {/* Readiness bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400">Beredskap</span>
                  <span className={`text-[10px] font-semibold ${status.text}`}>
                    {readiness}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${status.bar} transition-all duration-500`}
                    style={{ width: `${readiness}%` }}
                  />
                </div>
                <p className={`text-[9px] mt-1 ${status.text}`}>{status.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
