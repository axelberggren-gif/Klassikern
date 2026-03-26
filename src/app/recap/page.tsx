'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  getUserSessions,
  getUserGroupId,
  getActiveBossEncounter,
  getBossAttacks,
  getUserBadges,
  getGroupMembers,
  getWeekCompletionStats,
} from '@/lib/store';
import { getCurrentWeekNumber, getWeekRange } from '@/lib/date-utils';
import WeeklyRecap from '@/components/recap/WeeklyRecap';
import type { WeeklyRecapData } from '@/components/recap/WeeklyRecap';

export default function RecapPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [recapData, setRecapData] = useState<WeeklyRecapData | null>(null);

  useEffect(() => {
    if (!user || !profile) return;

    const loadRecapData = async () => {
      const weekNumber = getCurrentWeekNumber();
      // Show previous week's recap if it's early in the week (Mon-Tue), otherwise current week
      const recapWeek = new Date().getDay() <= 2 && new Date().getDay() >= 1
        ? Math.max(1, weekNumber - 1)
        : weekNumber;

      const { start: weekStart, end: weekEnd } = getWeekRange(recapWeek);

      const [allSessions, groupId, weekCompletion, allBadges] = await Promise.all([
        getUserSessions(user.id),
        getUserGroupId(user.id),
        getWeekCompletionStats(recapWeek, user.id),
        getUserBadges(user.id),
      ]);

      const weekSessions = allSessions.filter(s => {
        const d = new Date(s.date);
        return d >= weekStart && d < weekEnd;
      });

      // Badges earned this week
      const weekBadges = allBadges.filter(ub => {
        const d = new Date(ub.earned_at);
        return d >= weekStart && d < weekEnd;
      });

      let bossEncounter = null;
      let bossAttacks: Awaited<ReturnType<typeof getBossAttacks>> = [];
      let members: Awaited<ReturnType<typeof getGroupMembers>> = [];

      if (groupId) {
        [bossEncounter, members] = await Promise.all([
          getActiveBossEncounter(groupId),
          getGroupMembers(user.id),
        ]);

        if (bossEncounter) {
          bossAttacks = await getBossAttacks(bossEncounter.id);
        }
      }

      setRecapData({
        weekNumber: recapWeek,
        profile,
        weekSessions,
        allSessions,
        plannedCount: weekCompletion.planned,
        bossEncounter,
        bossAttacks,
        weekBadges,
        members,
      });
    };

    loadRecapData();
  }, [user, profile]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Laddar recap...</p>
        </div>
      </div>
    );
  }

  if (!recapData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Skapar din recap...</p>
        </div>
      </div>
    );
  }

  return <WeeklyRecap data={recapData} />;
}
