'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ArrowLeft } from 'lucide-react';
import AppShell from '@/components/AppShell';
import SessionReward from '@/components/SessionReward';
import BadgeUnlockModal from '@/components/BadgeUnlockModal';
import { SPORT_CONFIG, EFFORT_LABELS, ACTIVE_SPORT_TYPES } from '@/lib/sport-config';
import { useAuth } from '@/lib/auth';
import { logSession, getUserGroupId, getAllBadges, attackBoss } from '@/lib/store';
import { getPlanForWeek } from '@/lib/training-plan';
import { getCurrentWeekNumber } from '@/lib/date-utils';
import type { SportType, EffortRating, Session, Badge, PlannedSession } from '@/types/database';

export default function LogSessionPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [sportType, setSportType] = useState<SportType>('cycling');
  const [duration, setDuration] = useState(45);
  const [distance, setDistance] = useState('');
  const [effort, setEffort] = useState<EffortRating>(3);
  const [note, setNote] = useState('');
  const [todayPlanned, setTodayPlanned] = useState<PlannedSession | null>(null);
  const [reward, setReward] = useState<Session | null>(null);
  const [pendingBadges, setPendingBadges] = useState<Badge[]>([]);
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [bossDamage, setBossDamage] = useState<{
    damage: number;
    isCritical: boolean;
    bossEmoji: string;
    bossName: string;
    bossLevel: number;
    isKillingBlow: boolean;
    remainingHP: number;
    maxHP: number;
  } | null>(null);

  useEffect(() => {
    const wk = getCurrentWeekNumber();
    const plan = getPlanForWeek(wk);
    const todayDay = new Date().getDay();
    const ourDay = todayDay === 0 ? 7 : todayDay;
    const today = plan.find((p) => p.day_of_week === ourDay && p.sport_type !== 'rest');

    if (today) {
      setTodayPlanned(today);
      setSportType(today.sport_type);
      setDuration(today.suggested_duration_minutes || 45);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    getUserGroupId(user.id).then(setGroupId);
  }, [user]);

  async function handleSubmit() {
    if (!user || !profile || submitting) return;
    setSubmitting(true);

    const result = await logSession({
      userId: user.id,
      groupId,
      currentProfile: profile,
      sportType,
      durationMinutes: duration,
      distanceKm: distance ? parseFloat(distance) : null,
      effortRating: effort,
      note,
      plannedSessionId: todayPlanned?.sport_type === sportType ? todayPlanned.id : null,
    });

    setSubmitting(false);
    if (result) {
      // Attack boss if user is in a group
      if (groupId) {
        const bossResult = await attackBoss({
          userId: user.id,
          groupId,
          sessionId: result.session.id,
          sportType,
          epEarned: result.session.ep_earned,
        });
        setBossDamage(bossResult);
      }

      setReward(result.session);

      if (result.newBadges.length > 0) {
        const allBadgeDefs = await getAllBadges();
        const earned = allBadgeDefs.filter((b) =>
          result.newBadges.includes(b.name)
        );
        setPendingBadges(earned);
      }
    }
  }

  function handleRewardDone() {
    setReward(null);
    setBossDamage(null);
    if (pendingBadges.length > 0) {
      setCurrentBadge(pendingBadges[0]);
      setPendingBadges((prev) => prev.slice(1));
    } else {
      router.push('/');
    }
  }

  function handleBadgeDismiss() {
    if (pendingBadges.length > 0) {
      setCurrentBadge(pendingBadges[0]);
      setPendingBadges((prev) => prev.slice(1));
    } else {
      setCurrentBadge(null);
      router.push('/');
    }
  }

  const currentStreak = profile?.current_streak ?? 0;
  const streakMultiplier =
    currentStreak >= 7 ? 1.3 : currentStreak >= 5 ? 1.2 : currentStreak >= 3 ? 1.1 : 1;

  if (loading) return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Laddar...</p>
        </div>
      </div>
    );

  return (
    <AppShell>
      {reward && (
        <SessionReward
          session={reward}
          bossDamage={bossDamage}
          onDone={handleRewardDone}
        />
      )}

      {currentBadge && (
        <BadgeUnlockModal
          badge={currentBadge}
          onDismiss={handleBadgeDismiss}
        />
      )}

      {/* Header */}
      <div className="bg-slate-900 px-5 pt-12 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-slate-50">Logga pass</h1>
        </div>
        {todayPlanned && (
          <p className="mt-2 text-sm text-slate-400">
            Planerat idag: {todayPlanned.title}
            {todayPlanned.suggested_duration_minutes && ` · ${todayPlanned.suggested_duration_minutes} min`}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-6 px-5 py-6">
        {/* Sport type selector */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-200">Typ av pass</label>
          <div className="grid grid-cols-5 gap-2">
            {ACTIVE_SPORT_TYPES.map((type) => {
              const config = SPORT_CONFIG[type];
              const isSelected = sportType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSportType(type)}
                  className={`flex flex-col items-center gap-1 rounded-xl p-3 transition-all ${
                    isSelected
                      ? 'bg-slate-800 ring-2 ring-offset-1 ring-offset-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                  style={isSelected ? { '--tw-ring-color': config.color } as React.CSSProperties : undefined}
                >
                  <span className="text-xl">{config.icon}</span>
                  <span className={`text-[10px] font-medium ${isSelected ? 'text-slate-50' : 'text-slate-400'}`}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-200">Tid (minuter)</label>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setDuration(Math.max(5, duration - 5))}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-200 active:bg-slate-700"
            >
              <Minus size={20} />
            </button>
            <div className="flex w-24 flex-col items-center">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full text-center text-4xl font-bold text-slate-50 bg-transparent outline-none"
              />
              <span className="text-xs text-slate-400">min</span>
            </div>
            <button
              onClick={() => setDuration(duration + 5)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-200 active:bg-slate-700"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="mt-3 flex justify-center gap-2">
            {[30, 45, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  duration === d
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Distance (optional) */}
        {(sportType === 'cycling' || sportType === 'running' || sportType === 'swimming') && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Distans ({sportType === 'swimming' ? 'meter' : 'km'})
              <span className="text-slate-400 font-normal"> (valfritt)</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder={sportType === 'swimming' ? 'T.ex. 1000' : 'T.ex. 15'}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-50 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-500"
            />
          </div>
        )}

        {/* Effort rating */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-200">Hur kande det?</label>
          <div className="flex justify-between gap-1">
            {([1, 2, 3, 4, 5] as EffortRating[]).map((level) => {
              const config = EFFORT_LABELS[level];
              const isSelected = effort === level;
              return (
                <button
                  key={level}
                  onClick={() => setEffort(level)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl p-3 transition-all ${
                    isSelected
                      ? 'bg-emerald-500/15 ring-2 ring-emerald-400'
                      : 'bg-slate-900'
                  }`}
                >
                  <span className="text-2xl">{config.emoji}</span>
                  <span className={`text-[10px] font-medium ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-200">
            Anteckning <span className="text-slate-400 font-normal">(valfritt)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Hur gick det? Nagot speciellt?"
            rows={2}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-50 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none placeholder:text-slate-500"
          />
        </div>

        {/* EP preview */}
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
          <p className="text-sm text-emerald-400 font-medium">
            Du tjanar ca <span className="text-lg font-bold">
              {Math.round(
                (sportType === 'swimming' ? 12 : sportType === 'hiit' ? 8 : 10) *
                  (duration / 30) *
                  [1, 1, 1.1, 1.15, 1.2][effort - 1] *
                  streakMultiplier
              )}
            </span> EP
          </p>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white shadow-lg transition-transform active:scale-[0.97] disabled:opacity-60"
        >
          {submitting ? 'Sparar...' : 'Logga pass ✓'}
        </button>
      </div>
    </AppShell>
  );
}
