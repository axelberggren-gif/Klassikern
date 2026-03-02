'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { SPORT_CONFIG } from '@/lib/sport-config';
import { getCurrentWeekNumber, getPlanForWeek, getTotalWeeks } from '@/lib/training-plan';
import type { PlannedSession } from '@/types/database';

const DAY_NAMES = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

function WeekCard({ weekNumber, isCurrentWeek, initialOpen }: { weekNumber: number; isCurrentWeek: boolean; initialOpen: boolean }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const ref = useRef<HTMLDivElement>(null);
  const plan = getPlanForWeek(weekNumber);
  const activeSessions = plan.filter((p) => p.sport_type !== 'rest');

  // Get the Monday date for this week
  const startMonday = new Date(2026, 1, 23); // Feb 23, 2026
  const weekMonday = new Date(startMonday);
  weekMonday.setDate(weekMonday.getDate() + (weekNumber - 1) * 7);
  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekSunday.getDate() + 6);

  const formatDate = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

  useEffect(() => {
    if (isCurrentWeek && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isCurrentWeek]);

  return (
    <div
      ref={ref}
      className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${
        isCurrentWeek ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-200'
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            isCurrentWeek ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            {weekNumber}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">
              Vecka {weekNumber}
              {isCurrentWeek && <span className="ml-2 text-orange-500">(Nu)</span>}
            </p>
            <p className="text-xs text-gray-400">
              {formatDate(weekMonday)} – {formatDate(weekSunday)} · {activeSessions.length} pass
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {activeSessions.slice(0, 4).map((s, i) => (
              <span key={i} className="text-sm" title={SPORT_CONFIG[s.sport_type].label}>
                {SPORT_CONFIG[s.sport_type].icon}
              </span>
            ))}
          </div>
          {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 px-5 pb-4 pt-2">
          {plan.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: PlannedSession }) {
  const sport = SPORT_CONFIG[session.sport_type];
  const isRest = session.sport_type === 'rest';

  return (
    <div className={`flex items-center gap-3 py-2.5 ${isRest ? 'opacity-50' : ''}`}>
      <div className="w-12 text-xs font-medium text-gray-400">
        {DAY_NAMES[session.day_of_week - 1]?.slice(0, 3)}
      </div>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${sport.bgColor}`}>
        {sport.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isRest ? 'text-gray-400' : 'text-gray-800'}`}>
          {session.title}
        </p>
        {!isRest && (
          <p className="text-xs text-gray-400">
            {session.suggested_duration_minutes && `${session.suggested_duration_minutes} min`}
            {session.suggested_intensity && ` · ${session.suggested_intensity}`}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PlanPage() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const totalWeeks = getTotalWeeks();

  useEffect(() => {
    setCurrentWeek(getCurrentWeekNumber());
  }, []);

  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <AppShell>
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Träningsplan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vecka {currentWeek} av {totalWeeks} · Feb – Sep 2026
        </p>
      </div>

      {/* Race milestones */}
      <div className="px-5 py-3 flex gap-2 overflow-x-auto">
        <div className="flex-shrink-0 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700">
          🎿 Vasaloppet ✅
        </div>
        <div className="flex-shrink-0 rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700">
          🚴 Vätternrundan · Jun
        </div>
        <div className="flex-shrink-0 rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1.5 text-xs font-medium text-cyan-700">
          🏊 Vansbro · Jul
        </div>
        <div className="flex-shrink-0 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700">
          🏃 Lidingö · Sep
        </div>
      </div>

      {/* Weeks */}
      <div className="flex flex-col gap-3 px-4 py-4">
        {weeks.map((wk) => (
          <WeekCard
            key={wk}
            weekNumber={wk}
            isCurrentWeek={wk === currentWeek}
            initialOpen={wk === currentWeek}
          />
        ))}
      </div>
    </AppShell>
  );
}
