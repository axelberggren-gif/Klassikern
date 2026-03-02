'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StreakBadge from '@/components/dashboard/StreakBadge';
import TodayCard from '@/components/dashboard/TodayCard';
import WeekSummary from '@/components/dashboard/WeekSummary';
import ExpeditionProgress from '@/components/dashboard/ExpeditionProgress';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import { useAuth } from '@/lib/auth';
import { getGroupMembers, getUserSessions, getActivityFeed, getUserGroupId } from '@/lib/store';
import { getCurrentWeekNumber, getPlanForWeek } from '@/lib/training-plan';
import type { Profile, PlannedSession, Session, ActivityFeedItemWithUser } from '@/types/database';

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [todayPlan, setTodayPlan] = useState<PlannedSession[]>([]);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [weekPlan, setWeekPlan] = useState<PlannedSession[]>([]);
  const [weekSessions, setWeekSessions] = useState<Session[]>([]);
  const [feed, setFeed] = useState<ActivityFeedItemWithUser[]>([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;

    const loadData = async () => {
      const wk = getCurrentWeekNumber();
      const today = new Date().toISOString().split('T')[0];
      setWeekNumber(wk);

      // Today's plan
      const plan = getPlanForWeek(wk);
      const todayDay = new Date().getDay();
      // Convert JS day (0=Sun) to our format (1=Mon, 7=Sun)
      const ourDay = todayDay === 0 ? 7 : todayDay;
      setTodayPlan(plan.filter((p) => p.day_of_week === ourDay));
      setWeekPlan(plan);

      // Async data loading
      const [sessions, groupMembers, groupId] = await Promise.all([
        getUserSessions(user.id),
        getGroupMembers(user.id),
        getUserGroupId(user.id),
      ]);

      setTotalSessions(sessions.length);
      setTodaySessions(sessions.filter((s) => s.date === today));

      // Week sessions
      const weekStart = new Date(2026, 1, 23);
      weekStart.setDate(weekStart.getDate() + (wk - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      setWeekSessions(
        sessions.filter((s) => {
          const d = new Date(s.date);
          return d >= weekStart && d < weekEnd;
        })
      );

      setMembers(groupMembers);

      if (groupId) {
        const feedData = await getActivityFeed(groupId);
        setFeed(feedData);
      }
    };

    loadData();
  }, [user, profile]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-orange-500 border-t-transparent" />
          <p className="text-sm text-gray-400">Laddar...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 px-5 pt-12 pb-6 text-white">
        <div className="flex items-center justify-between mb-1">
          <Link href="/profile" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm opacity-80">Hej, {profile.display_name}!</p>
              <h1 className="text-2xl font-bold">Klassikern</h1>
            </div>
          </Link>
          <StreakBadge streak={profile.current_streak} />
        </div>
        <p className="text-xs opacity-70 mt-1">
          Vasaloppet ✅ · Vätternrundan ⏳ · Vansbro ⏳ · Lidingö ⏳
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4 -mt-3">
        {/* Today's session card */}
        <TodayCard todayPlan={todayPlan} todaySessions={todaySessions} />

        {/* Week summary */}
        <WeekSummary weekPlan={weekPlan} weekSessions={weekSessions} weekNumber={weekNumber} />

        {/* Expedition progress */}
        <ExpeditionProgress users={members} currentUserId={user!.id} />

        {/* Activity feed */}
        <ActivityFeed items={feed} />

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{profile.total_ep}</p>
            <p className="text-[10px] font-medium text-blue-500">EP totalt</p>
          </div>
          <div className="rounded-xl bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{totalSessions}</p>
            <p className="text-[10px] font-medium text-green-500">Pass</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{profile.longest_streak}</p>
            <p className="text-[10px] font-medium text-amber-500">Längsta streak</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
