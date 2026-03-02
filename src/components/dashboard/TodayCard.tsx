'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { SPORT_CONFIG } from '@/lib/sport-config';
import type { PlannedSession, Session } from '@/types/database';

interface TodayCardProps {
  todayPlan: PlannedSession[];
  todaySessions: Session[];
}

export default function TodayCard({ todayPlan, todaySessions }: TodayCardProps) {
  const router = useRouter();

  // Check if there's a non-rest planned session for today
  const activePlan = todayPlan.filter((p) => p.sport_type !== 'rest');
  const isRestDay = todayPlan.length > 0 && activePlan.length === 0;
  const hasLoggedToday = todaySessions.length > 0;

  if (isRestDay) {
    return (
      <div className="rounded-2xl bg-gray-100 p-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌙</span>
          <div>
            <p className="font-semibold text-gray-700">Vilodag</p>
            <p className="text-sm text-gray-500">Ladda batterierna. Du har förtjänat det!</p>
          </div>
        </div>
      </div>
    );
  }

  if (activePlan.length === 0 && !hasLoggedToday) {
    return (
      <button
        onClick={() => router.push('/log')}
        className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-left text-white shadow-md transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">Inget planerat idag</p>
            <p className="text-lg font-bold">Logga ett bonuspass?</p>
          </div>
          <ArrowRight size={24} />
        </div>
      </button>
    );
  }

  const nextSession = activePlan.find((p) => {
    return !todaySessions.some((s) => s.planned_session_id === p.id);
  });

  if (hasLoggedToday && !nextSession) {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={28} className="text-green-500" />
          <div>
            <p className="font-semibold text-green-700">Dagens pass klart!</p>
            <p className="text-sm text-green-600">
              {todaySessions.length} pass loggat{todaySessions.length > 1 ? 'e' : ''} idag
            </p>
          </div>
        </div>
      </div>
    );
  }

  const session = nextSession || activePlan[0];
  const sport = SPORT_CONFIG[session.sport_type];

  return (
    <button
      onClick={() => router.push('/log')}
      className="w-full rounded-2xl bg-white border border-gray-200 p-5 text-left shadow-sm transition-transform active:scale-[0.98]"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">Idag</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${sport.bgColor}`}>
            <span className="text-2xl">{sport.icon}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{session.title}</p>
            <p className="text-sm text-gray-500">
              {session.suggested_duration_minutes && `${session.suggested_duration_minutes} min`}
              {session.suggested_intensity && ` · ${session.suggested_intensity}`}
            </p>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white">
          <ArrowRight size={18} />
        </div>
      </div>
    </button>
  );
}
